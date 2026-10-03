import { cesiumSpawnFrame, DEFAULT_EYE_HEIGHT, ModelSpawn, readGlbModelSpawn } from '../viewer/modelSpawn';
import { readModelTransfer } from '../viewer/modelTransfer';
import DropboxModelButton from './DropboxModelButton';
import { ChangeEvent, FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import {
  BoundingSphere,
  Cartographic,
  Cartesian2,
  Cartesian3,
  CameraEventType,
  Color,
  ConstantPositionProperty,
  createWorldTerrainAsync,
  Entity,
  HeadingPitchRange,
  HeadingPitchRoll,
  HeightReference,
  Ion,
  KeyboardEventModifier,
  LabelStyle,
  Math as CesiumMath,
  Matrix4,
  Model,
  Ray,
  Rectangle,
  sampleTerrainMostDetailed,
  ScreenSpaceEventType,
  Transforms,
  VerticalOrigin,
  Viewer,
} from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';

const COCONINO_PARCEL_QUERY_URL = 'https://services1.arcgis.com/Rlvx5g8pKeK13apH/arcgis/rest/services/Coconino_County_Parcels_Public_View/FeatureServer/0/query';
const COCONINO_PARCEL_SOURCE_URL = 'https://services1.arcgis.com/Rlvx5g8pKeK13apH/arcgis/rest/services/Coconino_County_Parcels_Public_View/FeatureServer/0';
const WORLD_GEOCODER_URL = 'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates';

type PropertySite = {
  address: string;
  parcel: string;
  statedLotSize: string;
  latitude: number;
  longitude: number;
  boundary: number[];
  jurisdiction: string;
  sourceUrl: string;
  limitRadiusMiles?: number;
};

type RecentProperty = {
  site: PropertySite;
  lastOpenedAt: string;
};

type ParcelGeoJson = {
  features?: Array<{
    geometry?: { type?: string; coordinates?: number[][][] | number[][][][] };
    properties?: { APN?: string; SITUS?: string | null; SITUS_CITY?: string | null; Shape__Area?: number | null };
  }>;
};

type GeocoderResponse = {
  candidates?: Array<{
    address?: string;
    location?: { x?: number; y?: number };
    attributes?: { Match_addr?: string; Subregion?: string; Region?: string; City?: string; Postal?: string };
  }>;
};

const formatApn = (apn: string) => {
  const normalized = apn.replace(/[^a-z0-9]/gi, '').toUpperCase();
  return normalized.length >= 8
    ? `${normalized.slice(0, 3)}-${normalized.slice(3, 5)}-${normalized.slice(5)}`
    : normalized;
};

const polygonCenter = (ring: number[][]) => {
  let signedArea = 0;
  let longitudeSum = 0;
  let latitudeSum = 0;
  for (let index = 0; index < ring.length - 1; index += 1) {
    const [longitudeA, latitudeA] = ring[index];
    const [longitudeB, latitudeB] = ring[index + 1];
    const cross = (longitudeA * latitudeB) - (longitudeB * latitudeA);
    signedArea += cross;
    longitudeSum += (longitudeA + longitudeB) * cross;
    latitudeSum += (latitudeA + latitudeB) * cross;
  }
  if (Math.abs(signedArea) < 1e-12) {
    const points = ring.slice(0, -1);
    return {
      longitude: points.reduce((sum, point) => sum + point[0], 0) / points.length,
      latitude: points.reduce((sum, point) => sum + point[1], 0) / points.length,
    };
  }
  return {
    longitude: longitudeSum / (3 * signedArea),
    latitude: latitudeSum / (3 * signedArea),
  };
};

const WALK_SPEED = 5.25;
const JUMP_SPEED = 5.8;
const GRAVITY = 15;
const WALK_COLLISION_PADDING = 0.35;
const MAX_STEP_HEIGHT = 0.75;
const MAX_STEP_DOWN = 0.6;
const MODEL_PICK_ID = 'placed-house-model';
const RECENT_PROPERTIES_KEY = 'timpson:cesium-recent-properties:v1';
const MAX_RECENT_PROPERTIES = 8;
const DEFAULT_SITE_LIMIT_RADIUS_MILES = 10;
const FLIGHT_DEFAULT_HEIGHT = 9;
const FLIGHT_MIN_HEIGHT = 3;
const FLIGHT_MAX_HEIGHT = 45;
const FLIGHT_SPEED = 12;
const FLIGHT_FAST_SPEED = 28;

const projectLimitRectangle = (property: PropertySite) => {
  const points = Array.from({ length: property.boundary.length / 2 }, (_, index) => ({
    longitude: property.boundary[index * 2],
    latitude: property.boundary[(index * 2) + 1],
  }));
  const longitudes = points.length ? points.map((point) => point.longitude) : [property.longitude];
  const latitudes = points.length ? points.map((point) => point.latitude) : [property.latitude];
  const paddingMeters = (property.limitRadiusMiles ?? DEFAULT_SITE_LIMIT_RADIUS_MILES) * 1_609.344;
  const latitudePadding = paddingMeters / 111_320;
  const longitudePadding = paddingMeters
    / (111_320 * Math.max(0.1, Math.cos(CesiumMath.toRadians(property.latitude))));
  return Rectangle.fromDegrees(
    Math.min(...longitudes) - longitudePadding,
    Math.min(...latitudes) - latitudePadding,
    Math.max(...longitudes) + longitudePadding,
    Math.max(...latitudes) + latitudePadding,
  );
};

const readProjectPreset = (): PropertySite | null => {
  const parameters = new URLSearchParams(window.location.search);
  const latitudeParameter = parameters.get('lat');
  const longitudeParameter = parameters.get('lng');
  if (!latitudeParameter || !longitudeParameter) return null;
  const latitude = Number(latitudeParameter);
  const longitude = Number(longitudeParameter);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const radius = Number(parameters.get('radiusMiles'));
  return {
    address: parameters.get('address')?.trim() || 'Configured project site',
    parcel: parameters.get('parcel')?.trim() || 'Not provided',
    statedLotSize: 'Project-specific viewer',
    latitude,
    longitude,
    boundary: [],
    jurisdiction: parameters.get('jurisdiction')?.trim() || 'Configured project',
    sourceUrl: window.location.href,
    limitRadiusMiles: Number.isFinite(radius)
      ? CesiumMath.clamp(Math.max(radius, DEFAULT_SITE_LIMIT_RADIUS_MILES), DEFAULT_SITE_LIMIT_RADIUS_MILES, 25)
      : DEFAULT_SITE_LIMIT_RADIUS_MILES,
  };
};

const clampToRectangle = (longitude: number, latitude: number, rectangle: Rectangle) => ({
  longitude: CesiumMath.clamp(
    longitude,
    CesiumMath.toDegrees(rectangle.west),
    CesiumMath.toDegrees(rectangle.east),
  ),
  latitude: CesiumMath.clamp(
    latitude,
    CesiumMath.toDegrees(rectangle.south),
    CesiumMath.toDegrees(rectangle.north),
  ),
});

const readRecentProperties = (): RecentProperty[] => {
  try {
    const stored = JSON.parse(window.localStorage.getItem(RECENT_PROPERTIES_KEY) ?? '[]') as RecentProperty[];
    return Array.isArray(stored)
      ? stored.filter((entry) => entry?.site && Number.isFinite(entry.site.latitude) && Number.isFinite(entry.site.longitude))
      : [];
  } catch {
    return [];
  }
};

type CesiumRayHit = {
  object?: {
    id?: unknown;
    primitive?: { id?: unknown };
    detail?: { node?: { node?: { name?: string }; _name?: string } };
  };
  position?: Cartesian3;
};

const pickedNodeName = (hit: CesiumRayHit) => (
  hit.object?.detail?.node?.node?.name
  ?? hit.object?.detail?.node?._name
  ?? ''
).toLowerCase();

const isDoorNode = (name: string) => /door|leaf|jamb|trim|handle|lever|rose/.test(name);
const isWallNode = (name: string) => /collider[_ -]?wall|wall|sill infill|above header/.test(name);
const isWalkableNode = (name: string) => /collider[_ -]?(floor|stairs?)|floor|stair|step|landing|walkable/.test(name);

const CESIUM_UNSUPPORTED_GLTF_EXTENSIONS = new Set(['KHR_lights_punctual']);
const EMBEDDED_SITE_IMAGE_PATTERN = /aerial|orthophoto|ortho photo|satellite|site imagery|parcel imagery/i;

type PreparedGlb = {
  blob: Blob;
  embeddedSiteImageNodes: string[];
};

async function prepareGlbForCesium(file: File): Promise<PreparedGlb> {
  const buffer = await file.arrayBuffer();
  const view = new DataView(buffer);
  if (view.byteLength < 20 || view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2) {
    return { blob: file, embeddedSiteImageNodes: [] };
  }

  const jsonLength = view.getUint32(12, true);
  const jsonType = view.getUint32(16, true);
  if (jsonType !== 0x4e4f534a || 20 + jsonLength > view.byteLength) {
    return { blob: file, embeddedSiteImageNodes: [] };
  }

  const bytes = new Uint8Array(buffer);
  const gltf = JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + jsonLength)).trim()) as Record<string, unknown>;
  const embeddedSiteImageNodes = Array.isArray(gltf.nodes)
    ? (gltf.nodes as Array<{ name?: unknown }>).flatMap((node) => (
      typeof node.name === 'string' && EMBEDDED_SITE_IMAGE_PATTERN.test(node.name) ? [node.name] : []
    ))
    : [];
  let changed = false;

  const stripUnsupportedExtensions = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(stripUnsupportedExtensions);
      return;
    }
    if (!value || typeof value !== 'object') return;
    const object = value as Record<string, unknown>;

    for (const listName of ['extensionsUsed', 'extensionsRequired']) {
      if (!Array.isArray(object[listName])) continue;
      const filtered = (object[listName] as unknown[]).filter((extension) => (
        typeof extension !== 'string' || !CESIUM_UNSUPPORTED_GLTF_EXTENSIONS.has(extension)
      ));
      if (filtered.length !== (object[listName] as unknown[]).length) changed = true;
      if (filtered.length) object[listName] = filtered;
      else delete object[listName];
    }

    if (object.extensions && typeof object.extensions === 'object' && !Array.isArray(object.extensions)) {
      const extensions = object.extensions as Record<string, unknown>;
      for (const extension of CESIUM_UNSUPPORTED_GLTF_EXTENSIONS) {
        if (extension in extensions) {
          delete extensions[extension];
          changed = true;
        }
      }
      if (!Object.keys(extensions).length) delete object.extensions;
    }
    Object.values(object).forEach(stripUnsupportedExtensions);
  };

  stripUnsupportedExtensions(gltf);
  if (!changed) return { blob: file, embeddedSiteImageNodes };

  const cleanedJson = new TextEncoder().encode(JSON.stringify(gltf));
  if (cleanedJson.length > jsonLength) throw new Error('The Cesium-safe GLB metadata did not fit in the source file.');
  bytes.fill(0x20, 20, 20 + jsonLength);
  bytes.set(cleanedJson, 20);
  return { blob: new Blob([bytes], { type: 'model/gltf-binary' }), embeddedSiteImageNodes };
}

const waitForModelReady = (model: Model) => {
  if (model.ready) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const removers: Array<() => void> = [];
    const cleanup = () => removers.splice(0).forEach((remove) => remove());
    removers.push(model.readyEvent.addEventListener(() => {
      cleanup();
      resolve();
    }));
    removers.push(model.errorEvent.addEventListener((modelError: { message?: string }) => {
      cleanup();
      reject(new Error(modelError.message || 'Cesium could not finish rendering the GLB.'));
    }));
  });
};

type Placement = {
  latitude: number;
  longitude: number;
  heading: number;
  elevationOffset: number;
  scale: number;
};

type SpawnPoint = {
  latitude: number;
  longitude: number;
  surfaceHeight: number;
  localOffset?: {
    eastMeters: number;
    northMeters: number;
    upMeters: number;
  };
};

type CachedProjectModel = {
  propertyId: string;
  fileName: string;
  blob: Blob;
  embeddedSiteImageNodes: string[];
  placement: Placement;
  updatedAt: string;
};

const propertyStorageId = (property: PropertySite) => property.parcel !== 'Not provided'
  ? property.parcel
  : `${property.latitude.toFixed(6)},${property.longitude.toFixed(6)}`;

const PROJECT_MODEL_DB = 'timpson-cesium-projects';
const PROJECT_MODEL_STORE = 'models';

const openProjectModelDatabase = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = window.indexedDB.open(PROJECT_MODEL_DB, 1);
  request.onupgradeneeded = () => {
    if (!request.result.objectStoreNames.contains(PROJECT_MODEL_STORE)) {
      request.result.createObjectStore(PROJECT_MODEL_STORE, { keyPath: 'propertyId' });
    }
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error ?? new Error('Project model storage could not be opened.'));
});

const readCachedProjectModel = async (propertyId: string) => {
  const database = await openProjectModelDatabase();
  try {
    return await new Promise<CachedProjectModel | undefined>((resolve, reject) => {
      const request = database.transaction(PROJECT_MODEL_STORE, 'readonly').objectStore(PROJECT_MODEL_STORE).get(propertyId);
      request.onsuccess = () => resolve(request.result as CachedProjectModel | undefined);
      request.onerror = () => reject(request.error ?? new Error('Cached project model could not be read.'));
    });
  } finally {
    database.close();
  }
};

const writeCachedProjectModel = async (model: CachedProjectModel) => {
  const database = await openProjectModelDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const request = database.transaction(PROJECT_MODEL_STORE, 'readwrite').objectStore(PROJECT_MODEL_STORE).put(model);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error('Project model could not be cached.'));
    });
  } finally {
    database.close();
  }
};

const spawnWorldPoint = (spawn: SpawnPoint, placement: Placement, anchorHeight: number): SpawnPoint => {
  if (!spawn.localOffset) return spawn;
  const heading = CesiumMath.toRadians(placement.heading);
  const scale = Math.max(placement.scale, 0.0001);
  const localEast = spawn.localOffset.eastMeters * scale;
  const localNorth = spawn.localOffset.northMeters * scale;
  const eastMeters = (localEast * Math.cos(heading)) + (localNorth * Math.sin(heading));
  const northMeters = (localNorth * Math.cos(heading)) - (localEast * Math.sin(heading));
  return {
    ...spawn,
    latitude: placement.latitude + (northMeters / 111_320),
    longitude: placement.longitude + (eastMeters / (111_320 * Math.cos(CesiumMath.toRadians(placement.latitude)))),
    surfaceHeight: anchorHeight + (spawn.localOffset.upMeters * scale),
  };
};

function Terrain({ authoredSpawn, property, token, modelUrl, fileName, embeddedSiteImageNodes, placement, onPlacementChange }: { authoredSpawn: ModelSpawn | null; property: PropertySite; token: string; modelUrl: string; fileName: string; embeddedSiteImageNodes: string[]; placement: Placement; onPlacementChange: (placement: Placement) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer>();
  const modelPrimitive = useRef<Model>();
  const propertyEntity = useRef<Entity>();
  const anchorEntity = useRef<Entity>();
  const spawnEntity = useRef<Entity>();
  const loadedModelUrl = useRef('');
  const placementRequest = useRef(0);
  const placedHeight = useRef(0);
  const siteGroundHeight = useRef(0);
  const walkKeys = useRef(new Set<string>());
  const walkHeading = useRef(0);
  const walkPitch = useRef(0);
  const walkCoordinates = useRef({ latitude: placement.latitude, longitude: placement.longitude });
  const walkSurfaceHeight = useRef(0);
  const walkEyeHeight = useRef(DEFAULT_EYE_HEIGHT);
  const walkVerticalOffset = useRef(0);
  const walkVerticalVelocity = useRef(0);
  const walkJumpCount = useRef(0);
  const lastWalkFrame = useRef(0);
  const navigationMode = useRef<'walk' | 'flight' | null>(null);
  const flightCoordinates = useRef({ latitude: placement.latitude, longitude: placement.longitude });
  const flightHeight = useRef(FLIGHT_DEFAULT_HEIGHT);
  const flightGroundHeight = useRef(0);
  const inspectionHeading = useRef(CesiumMath.toRadians(placement.heading));
  const inspectionPitch = useRef(CesiumMath.toRadians(-25));
  const [viewerReady, setViewerReady] = useState(false);
  const [isWalking, setIsWalking] = useState(false);
  const [isFlying, setIsFlying] = useState(false);
  const [isChoosingAnchor, setIsChoosingAnchor] = useState(false);
  const [isChoosingSpawn, setIsChoosingSpawn] = useState(false);
  const [spawnPoint, setSpawnPoint] = useState<SpawnPoint | null>(null);
  const [modelStatus, setModelStatus] = useState('');
  useEffect(() => { setSpawnPoint(null); }, [modelUrl]);
  const [showEmbeddedSiteImagery, setShowEmbeddedSiteImagery] = useState(false);
  const [nudgeFeet, setNudgeFeet] = useState(1);
  const [error, setError] = useState('');

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewerReady || !viewer) return;
    if (!spawnPoint) {
      if (spawnEntity.current) viewer.entities.remove(spawnEntity.current);
      spawnEntity.current = undefined;
      return;
    }
    const worldSpawn = spawnWorldPoint(spawnPoint, placement, placedHeight.current);
    const position = Cartesian3.fromDegrees(
      worldSpawn.longitude,
      worldSpawn.latitude,
      worldSpawn.surfaceHeight + 0.08,
    );
    if (!spawnEntity.current) {
      spawnEntity.current = viewer.entities.add({
        name: 'First-person spawn',
        position,
        point: { color: Color.CYAN, outlineColor: Color.WHITE, outlineWidth: 2, pixelSize: 12 },
        label: {
          text: 'FP spawn',
          fillColor: Color.WHITE,
          outlineColor: Color.BLACK,
          outlineWidth: 3,
          pixelOffset: new Cartesian2(0, -20),
          style: LabelStyle.FILL_AND_OUTLINE,
        },
      });
    } else {
      spawnEntity.current.position = new ConstantPositionProperty(position);
    }
  }, [modelStatus, placement, spawnPoint, viewerReady]);

  const flyToProperty = useCallback((viewer: Viewer, duration = 1.2) => {
    viewer.camera.flyTo({
      destination: projectLimitRectangle(property),
      duration,
    });
  }, [property]);

  useEffect(() => {
    if (!container.current) return;

    let viewer: Viewer | undefined;
    let cancelled = false;

    const start = async () => {
      try {
        Ion.defaultAccessToken = token;
        const terrainProvider = await createWorldTerrainAsync();
        if (cancelled || !container.current) return;

        viewer = new Viewer(container.current, {
          terrainProvider,
          animation: false,
          baseLayerPicker: true,
          fullscreenButton: true,
          geocoder: false,
          homeButton: false,
          infoBox: false,
          sceneModePicker: false,
          selectionIndicator: false,
          timeline: false,
        });
        viewerRef.current = viewer;

        const siteRectangle = projectLimitRectangle(property);
        viewer.scene.globe.cartographicLimitRectangle = siteRectangle;
        viewer.scene.globe.maximumScreenSpaceError = 3;
        viewer.scene.globe.tileCacheSize = 300;
        viewer.scene.globe.preloadSiblings = true;

        try {
          const [sitePoint] = await sampleTerrainMostDetailed(terrainProvider, [
            Cartographic.fromDegrees(property.longitude, property.latitude),
          ]);
          siteGroundHeight.current = sitePoint.height ?? 0;
        } catch {
          siteGroundHeight.current = 0;
        }
        if (cancelled || viewer.isDestroyed()) return;
        setViewerReady(true);

        const controls = viewer.scene.screenSpaceCameraController;
        controls.rotateEventTypes = CameraEventType.LEFT_DRAG;
        controls.zoomEventTypes = [CameraEventType.WHEEL, CameraEventType.PINCH];
        controls.tiltEventTypes = [
          CameraEventType.RIGHT_DRAG,
          CameraEventType.PINCH,
          { eventType: CameraEventType.LEFT_DRAG, modifier: KeyboardEventModifier.SHIFT },
        ];
        controls.lookEventTypes = [
          { eventType: CameraEventType.LEFT_DRAG, modifier: KeyboardEventModifier.CTRL },
        ];
        controls.enableCollisionDetection = true;

        propertyEntity.current = viewer.entities.add({
          position: Cartesian3.fromDegrees(property.longitude, property.latitude),
          point: {
            color: Color.fromCssColorString('#C8581E'),
            heightReference: HeightReference.CLAMP_TO_GROUND,
            outlineColor: Color.WHITE,
            outlineWidth: 3,
            pixelSize: 14,
          },
          label: {
            text: `${property.address}\nAPN ${property.parcel}`,
            fillColor: Color.WHITE,
            heightReference: HeightReference.CLAMP_TO_GROUND,
            outlineColor: Color.BLACK,
            outlineWidth: 4,
            pixelOffset: new Cartesian2(0, -28),
            style: LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: VerticalOrigin.BOTTOM,
          },
        });

        if (property.boundary.length >= 6) {
          viewer.entities.add({
            name: `Approximate parcel boundary · ${property.parcel}`,
            polyline: {
              positions: Cartesian3.fromDegreesArray(property.boundary),
              clampToGround: true,
              material: Color.fromCssColorString('#C8581E'),
              width: 4,
            },
          });
        }

        flyToProperty(viewer, 1.8);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Cesium terrain could not be loaded.');
      }
    };

    void start();
    return () => {
      cancelled = true;
      viewer?.destroy();
      viewerRef.current = undefined;
      modelPrimitive.current = undefined;
      anchorEntity.current = undefined;
      propertyEntity.current = undefined;
      spawnEntity.current = undefined;
    };
  }, [flyToProperty, property, token]);

  useEffect(() => {
    if (propertyEntity.current) propertyEntity.current.show = !modelUrl;
    if (anchorEntity.current) anchorEntity.current.show = !modelUrl;
    viewerRef.current?.scene.requestRender();
  }, [modelUrl, modelStatus]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewerReady || !viewer || !isChoosingAnchor) return;

    viewer.screenSpaceEventHandler.setInputAction((movement: { position: Cartesian2 }) => {
      const ray = viewer.camera.getPickRay(movement.position);
      const pickedPosition = ray ? viewer.scene.globe.pick(ray, viewer.scene) : undefined;
      if (!pickedPosition) {
        setError('Click a visible point on the terrain to place the model anchor.');
        return;
      }
      const cartographic = Cartographic.fromCartesian(pickedPosition);
      onPlacementChange({
        ...placement,
        latitude: CesiumMath.toDegrees(cartographic.latitude),
        longitude: CesiumMath.toDegrees(cartographic.longitude),
      });
      setIsChoosingAnchor(false);
      setError('');
    }, ScreenSpaceEventType.LEFT_CLICK);

    return () => viewer.screenSpaceEventHandler.removeInputAction(ScreenSpaceEventType.LEFT_CLICK);
  }, [isChoosingAnchor, onPlacementChange, placement, viewerReady]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewerReady || !viewer || !isChoosingSpawn) return;

    viewer.screenSpaceEventHandler.setInputAction((movement: { position: Cartesian2 }) => {
      const depthPosition = viewer.scene.pickPositionSupported
        ? viewer.scene.pickPosition(movement.position)
        : undefined;
      const ray = viewer.camera.getPickRay(movement.position);
      const pickedPosition = depthPosition ?? (ray ? viewer.scene.globe.pick(ray, viewer.scene) : undefined);
      if (!pickedPosition) {
        setError('Click a visible floor or ground point to set the first-person spawn.');
        return;
      }
      const cartographic = Cartographic.fromCartesian(pickedPosition);
      const latitude = CesiumMath.toDegrees(cartographic.latitude);
      const longitude = CesiumMath.toDegrees(cartographic.longitude);
      const eastMeters = (longitude - placement.longitude) * 111_320 * Math.cos(CesiumMath.toRadians(placement.latitude));
      const northMeters = (latitude - placement.latitude) * 111_320;
      const heading = CesiumMath.toRadians(placement.heading);
      const scale = Math.max(placement.scale, 0.0001);
      const nextSpawn = {
        latitude,
        longitude,
        surfaceHeight: cartographic.height,
        localOffset: {
          eastMeters: ((eastMeters * Math.cos(heading)) - (northMeters * Math.sin(heading))) / scale,
          northMeters: ((northMeters * Math.cos(heading)) + (eastMeters * Math.sin(heading))) / scale,
          upMeters: (cartographic.height - placedHeight.current) / scale,
        },
      };
      setSpawnPoint(nextSpawn);
      const position = Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, cartographic.height + 0.08);
      if (!spawnEntity.current) {
        spawnEntity.current = viewer.entities.add({
          name: 'First-person spawn',
          position,
          point: { color: Color.CYAN, outlineColor: Color.WHITE, outlineWidth: 2, pixelSize: 12 },
          label: {
            text: 'FP spawn',
            fillColor: Color.WHITE,
            outlineColor: Color.BLACK,
            outlineWidth: 3,
            pixelOffset: new Cartesian2(0, -20),
            style: LabelStyle.FILL_AND_OUTLINE,
          },
        });
      } else {
        spawnEntity.current.position = new ConstantPositionProperty(position);
      }
      setIsChoosingSpawn(false);
      setError('');
    }, ScreenSpaceEventType.LEFT_CLICK);

    return () => viewer.screenSpaceEventHandler.removeInputAction(ScreenSpaceEventType.LEFT_CLICK);
  }, [isChoosingSpawn, placement, viewerReady]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewerReady || !viewer || !modelUrl) return;

    const requestId = ++placementRequest.current;
    const place = async () => {
      try {
        setModelStatus('Loading and placing model…');
        const locations = await sampleTerrainMostDetailed(
          viewer.terrainProvider,
          [Cartographic.fromDegrees(placement.longitude, placement.latitude)],
        );
        if (requestId !== placementRequest.current || viewer.isDestroyed()) return;

        const terrainHeight = locations[0].height ?? 0;
        const height = terrainHeight + placement.elevationOffset;
        placedHeight.current = height;
        const position = Cartesian3.fromDegrees(placement.longitude, placement.latitude, height);
        const modelMatrix = Transforms.headingPitchRollToFixedFrame(
          position,
          new HeadingPitchRoll(CesiumMath.toRadians(placement.heading), 0, 0),
        );

        if (!anchorEntity.current) {
          anchorEntity.current = viewer.entities.add({
            name: 'Model anchor',
            position,
            point: {
              color: Color.ORANGE,
              outlineColor: Color.WHITE,
              outlineWidth: 2,
              pixelSize: 11,
            },
            label: {
              text: 'Model anchor',
              fillColor: Color.WHITE,
              outlineColor: Color.BLACK,
              outlineWidth: 3,
              pixelOffset: new Cartesian2(0, -20),
              style: LabelStyle.FILL_AND_OUTLINE,
            },
          });
        } else {
          anchorEntity.current.position = new ConstantPositionProperty(position);
        }

        let shouldFrameModel = false;
        if (!modelPrimitive.current || loadedModelUrl.current !== modelUrl) {
          if (modelPrimitive.current) {
            viewer.scene.primitives.remove(modelPrimitive.current);
            modelPrimitive.current = undefined;
          }
          const loadedModel = await Model.fromGltfAsync({
            url: modelUrl,
            modelMatrix,
            scale: placement.scale,
            id: MODEL_PICK_ID,
          });
          if (requestId !== placementRequest.current || viewer.isDestroyed()) {
            loadedModel.destroy();
            return;
          }
          viewer.scene.primitives.add(loadedModel);
          modelPrimitive.current = loadedModel;
          loadedModelUrl.current = modelUrl;
          shouldFrameModel = true;
          await waitForModelReady(loadedModel);
          if (requestId !== placementRequest.current || viewer.isDestroyed() || modelPrimitive.current !== loadedModel) return;
        } else {
          const activeModel = modelPrimitive.current;
          activeModel.modelMatrix = modelMatrix;
          activeModel.scale = placement.scale;
          await waitForModelReady(activeModel);
          if (requestId !== placementRequest.current || viewer.isDestroyed() || modelPrimitive.current !== activeModel) return;
        }

        if (shouldFrameModel && modelPrimitive.current) {
          inspectionHeading.current = CesiumMath.toRadians(placement.heading);
          inspectionPitch.current = CesiumMath.toRadians(-25);
          viewer.camera.flyToBoundingSphere(new BoundingSphere(
            Cartesian3.fromDegrees(placement.longitude, placement.latitude, placedHeight.current + 4),
            Math.max(32, 45 * placement.scale),
          ), {
            duration: 1.2,
            offset: new HeadingPitchRange(CesiumMath.toRadians(placement.heading), CesiumMath.toRadians(-25), Math.max(55, 85 * placement.scale)),
          });
        }
        setModelStatus('Model placed');
      } catch (caught) {
        setModelStatus('Model failed to load');
        setError(caught instanceof Error ? caught.message : 'The model could not be placed.');
      }
    };

    void place();
  }, [fileName, modelUrl, placement, viewerReady]);

  useEffect(() => {
    const viewer = viewerRef.current;
    const model = modelPrimitive.current;
    if (!viewer || !model?.ready || !embeddedSiteImageNodes.length) return;
    embeddedSiteImageNodes.forEach((nodeName) => {
      try {
        model.getNode(nodeName).show = showEmbeddedSiteImagery;
      } catch {
        // A duplicate or sanitized node name may not be exposed by Cesium.
      }
    });
    viewer.scene.requestRender();
  }, [embeddedSiteImageNodes, modelStatus, showEmbeddedSiteImagery]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewerReady || !viewer) return;
    const canvas = viewer.canvas;

    const stopNavigation = () => {
      walkKeys.current.clear();
      walkVerticalOffset.current = 0;
      walkVerticalVelocity.current = 0;
      walkJumpCount.current = 0;
      navigationMode.current = null;
      viewer.resolutionScale = 1;
      viewer.scene.screenSpaceCameraController.enableInputs = true;
      setIsWalking(false);
      setIsFlying(false);
    };
    const pointerLockChange = () => {
      if (document.pointerLockElement === canvas) {
        lastWalkFrame.current = performance.now();
        viewer.scene.screenSpaceCameraController.enableInputs = false;
        setIsWalking(navigationMode.current === 'walk');
        setIsFlying(navigationMode.current === 'flight');
        viewer.resolutionScale = navigationMode.current === 'flight' ? 0.9 : 1;
      } else {
        stopNavigation();
      }
    };
    const keyDown = (event: KeyboardEvent) => {
      if (document.pointerLockElement !== canvas) return;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
      if (navigationMode.current === 'walk' && event.code === 'Space' && !event.repeat && walkJumpCount.current < 2) {
        walkVerticalVelocity.current = JUMP_SPEED;
        walkJumpCount.current += 1;
      }
      walkKeys.current.add(event.key.toLowerCase());
    };
    const keyUp = (event: KeyboardEvent) => walkKeys.current.delete(event.key.toLowerCase());
    const mouseMove = (event: MouseEvent) => {
      if (document.pointerLockElement !== canvas) return;
      walkHeading.current += event.movementX * 0.002;
      const isFlight = navigationMode.current === 'flight';
      walkPitch.current = CesiumMath.clamp(
        walkPitch.current - event.movementY * 0.002,
        CesiumMath.toRadians(-85),
        CesiumMath.toRadians(isFlight ? -5 : 85),
      );
    };
    const tick = () => {
      if (document.pointerLockElement !== canvas) return;
      const now = performance.now();
      const delta = Math.min((now - lastWalkFrame.current) / 1000, 1 / 20);
      lastWalkFrame.current = now;

      const forward = Number(walkKeys.current.has('w') || walkKeys.current.has('arrowup'))
        - Number(walkKeys.current.has('s') || walkKeys.current.has('arrowdown'));
      const right = Number(walkKeys.current.has('d') || walkKeys.current.has('arrowright'))
        - Number(walkKeys.current.has('a') || walkKeys.current.has('arrowleft'));
      if (navigationMode.current === 'flight') {
        const length = Math.hypot(forward, right) || 1;
        const speed = walkKeys.current.has('shift') ? FLIGHT_FAST_SPEED : FLIGHT_SPEED;
        const distance = speed * delta;
        const northMeters = ((forward * Math.cos(walkHeading.current)) - (right * Math.sin(walkHeading.current))) / length * distance;
        const eastMeters = ((forward * Math.sin(walkHeading.current)) + (right * Math.cos(walkHeading.current))) / length * distance;
        const latitudeRadians = CesiumMath.toRadians(flightCoordinates.current.latitude);
        const unclampedLatitude = flightCoordinates.current.latitude + (northMeters / 111_320);
        const unclampedLongitude = flightCoordinates.current.longitude + (eastMeters / (111_320 * Math.cos(latitudeRadians)));
        flightCoordinates.current = clampToRectangle(
          unclampedLongitude,
          unclampedLatitude,
          projectLimitRectangle(property),
        );

        const vertical = Number(walkKeys.current.has('e')) - Number(walkKeys.current.has('q'));
        flightHeight.current = CesiumMath.clamp(
          flightHeight.current + (vertical * 8 * delta),
          FLIGHT_MIN_HEIGHT,
          FLIGHT_MAX_HEIGHT,
        );
        const groundPosition = Cartographic.fromDegrees(
          flightCoordinates.current.longitude,
          flightCoordinates.current.latitude,
        );
        const sampledGround = viewer.scene.globe.getHeight(groundPosition);
        if (sampledGround !== undefined) {
          const groundBlend = 1 - Math.exp(-6 * delta);
          flightGroundHeight.current += (sampledGround - flightGroundHeight.current) * groundBlend;
        }
        viewer.camera.setView({
          destination: Cartesian3.fromDegrees(
            flightCoordinates.current.longitude,
            flightCoordinates.current.latitude,
            flightGroundHeight.current + flightHeight.current,
          ),
          orientation: { heading: walkHeading.current, pitch: walkPitch.current, roll: 0 },
        });
        return;
      }
      const rayPicker = viewer.scene as typeof viewer.scene & {
        pickFromRay: (ray: Ray, excluded?: object[], width?: number) => CesiumRayHit | undefined;
        drillPickFromRay: (ray: Ray, limit?: number, excluded?: object[], width?: number) => CesiumRayHit[];
      };
      const findWalkableSurface = (longitude: number, latitude: number, referenceHeight: number) => {
        const probeOrigin = Cartesian3.fromDegrees(longitude, latitude, referenceHeight + MAX_STEP_HEIGHT);
        const probeTarget = Cartesian3.fromDegrees(longitude, latitude, referenceHeight - MAX_STEP_DOWN);
        const probeDirection = Cartesian3.normalize(
          Cartesian3.subtract(probeTarget, probeOrigin, new Cartesian3()),
          new Cartesian3(),
        );
        const maximumProbeDistance = MAX_STEP_HEIGHT + MAX_STEP_DOWN + 0.05;
        const hit = rayPicker.drillPickFromRay(new Ray(probeOrigin, probeDirection), 32).find((candidate) => {
          if (!candidate.position || Cartesian3.distance(probeOrigin, candidate.position) > maximumProbeDistance) return false;
          const hitId = candidate.object?.id ?? candidate.object?.primitive?.id;
          return hitId === MODEL_PICK_ID && isWalkableNode(pickedNodeName(candidate));
        });
        return hit?.position ? {
          height: Cartographic.fromCartesian(hit.position).height,
          nodeName: pickedNodeName(hit),
        } : undefined;
      };
      let nextSurface: { height: number; nodeName: string } | undefined;
      if (forward || right) {
        const length = Math.hypot(forward, right) || 1;
        const distance = WALK_SPEED * delta;
        const northMeters = ((forward * Math.cos(walkHeading.current)) - (right * Math.sin(walkHeading.current))) / length * distance;
        const eastMeters = ((forward * Math.sin(walkHeading.current)) + (right * Math.cos(walkHeading.current))) / length * distance;
        const latitudeRadians = CesiumMath.toRadians(walkCoordinates.current.latitude);
        const nextLatitude = walkCoordinates.current.latitude + (northMeters / 111_320);
        const nextLongitude = walkCoordinates.current.longitude + (eastMeters / (111_320 * Math.cos(latitudeRadians)));
        const movementLength = Math.hypot(northMeters, eastMeters) || 1;
        const northDirection = northMeters / movementLength;
        const eastDirection = eastMeters / movementLength;
        const blocked = [-WALK_COLLISION_PADDING, 0, WALK_COLLISION_PADDING].some((sideOffset) => [0.45, 1.25].some((height) => {
          const sideNorthMeters = -eastDirection * sideOffset;
          const sideEastMeters = northDirection * sideOffset;
          const sideLatitude = sideNorthMeters / 111_320;
          const sideLongitude = sideEastMeters / (111_320 * Math.cos(latitudeRadians));
          const origin = Cartesian3.fromDegrees(
            walkCoordinates.current.longitude + sideLongitude,
            walkCoordinates.current.latitude + sideLatitude,
            walkSurfaceHeight.current + height + walkVerticalOffset.current,
          );
          const target = Cartesian3.fromDegrees(
            nextLongitude + sideLongitude,
            nextLatitude + sideLatitude,
            walkSurfaceHeight.current + height + walkVerticalOffset.current,
          );
          const direction = Cartesian3.normalize(Cartesian3.subtract(target, origin, new Cartesian3()), new Cartesian3());
          return rayPicker.drillPickFromRay(new Ray(origin, direction), 24).some((hit) => {
            if (!hit.position || Cartesian3.distance(origin, hit.position) > distance + WALK_COLLISION_PADDING) return false;
            const hitId = hit.object?.id ?? hit.object?.primitive?.id;
            const nodeName = pickedNodeName(hit);
            return hitId === MODEL_PICK_ID && isWallNode(nodeName) && !isDoorNode(nodeName);
          });
        }));
        const candidateSurface = findWalkableSurface(nextLongitude, nextLatitude, walkSurfaceHeight.current);
        const candidateTerrainPosition = Cartographic.fromDegrees(nextLongitude, nextLatitude);
        const candidateTerrainHeight = viewer.scene.globe.getHeight(candidateTerrainPosition);
        const candidateHeight = candidateSurface?.height ?? candidateTerrainHeight;
        const stepUp = candidateHeight === undefined ? 0 : candidateHeight - walkSurfaceHeight.current;
        const hasReachableSurface = candidateHeight === undefined
          || (stepUp <= MAX_STEP_HEIGHT + 0.05 && stepUp >= -MAX_STEP_DOWN - 0.1);
        if (!blocked && hasReachableSurface) {
          walkCoordinates.current.latitude = nextLatitude;
          walkCoordinates.current.longitude = nextLongitude;
          nextSurface = candidateSurface;
          if (!nextSurface && candidateTerrainHeight !== undefined) {
            nextSurface = { height: candidateTerrainHeight, nodeName: 'terrain' };
          }
        }
      }

      if (walkVerticalOffset.current > 0 || walkVerticalVelocity.current > 0) {
        walkVerticalVelocity.current -= GRAVITY * delta;
        walkVerticalOffset.current += walkVerticalVelocity.current * delta;
        if (walkVerticalOffset.current <= 0) {
          walkVerticalOffset.current = 0;
          walkVerticalVelocity.current = 0;
          walkJumpCount.current = 0;
        }
      }

      const groundPosition = Cartographic.fromDegrees(
        walkCoordinates.current.longitude,
        walkCoordinates.current.latitude,
      );
      const terrainHeight = viewer.scene.globe.getHeight(groundPosition)
        ?? (placedHeight.current - placement.elevationOffset);

      const floorSurface = nextSurface ?? findWalkableSurface(
        walkCoordinates.current.longitude,
        walkCoordinates.current.latitude,
        walkSurfaceHeight.current,
      );
      let targetSurfaceHeight = walkSurfaceHeight.current;
      if (floorSurface) {
        targetSurfaceHeight = floorSurface.height;
      } else if (Math.abs(terrainHeight - walkSurfaceHeight.current) <= MAX_STEP_DOWN + 0.1) {
        targetSurfaceHeight = terrainHeight;
      }
      const maximumSurfaceChange = /collider[_ -]?stairs?|stair|step/.test(floorSurface?.nodeName ?? '')
        ? MAX_STEP_HEIGHT
        : Math.max(0.08, WALK_SPEED * delta);
      walkSurfaceHeight.current += CesiumMath.clamp(
        targetSurfaceHeight - walkSurfaceHeight.current,
        -maximumSurfaceChange,
        maximumSurfaceChange,
      );
      viewer.camera.setView({
        destination: Cartesian3.fromDegrees(
          walkCoordinates.current.longitude,
          walkCoordinates.current.latitude,
          walkSurfaceHeight.current + walkEyeHeight.current + walkVerticalOffset.current,
        ),
        orientation: { heading: walkHeading.current, pitch: walkPitch.current, roll: 0 },
      });
    };

    document.addEventListener('pointerlockchange', pointerLockChange);
    document.addEventListener('mousemove', mouseMove);
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    window.addEventListener('blur', stopNavigation);
    viewer.clock.onTick.addEventListener(tick);
    return () => {
      document.removeEventListener('pointerlockchange', pointerLockChange);
      document.removeEventListener('mousemove', mouseMove);
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      window.removeEventListener('blur', stopNavigation);
      viewer.clock.onTick.removeEventListener(tick);
    };
  }, [placement.elevationOffset, property, viewerReady]);

  const updatePlacement = (key: keyof Placement, value: number) => {
    if (!Number.isFinite(value)) return;
    onPlacementChange({ ...placement, [key]: value });
  };

  const setHeading = (heading: number) => {
    const normalizedHeading = ((heading % 360) + 360) % 360;
    onPlacementChange({ ...placement, heading: normalizedHeading });
  };

  const nudgePlacement = (northFeet: number, eastFeet: number) => {
    const feetToMeters = 0.3048;
    const northMeters = northFeet * feetToMeters;
    const eastMeters = eastFeet * feetToMeters;
    const latitudeRadians = CesiumMath.toRadians(placement.latitude);
    onPlacementChange({
      ...placement,
      latitude: placement.latitude + (northMeters / 111_320),
      longitude: placement.longitude + (eastMeters / (111_320 * Math.cos(latitudeRadians))),
    });
  };

  const adjustElevation = (feet: number) => {
    onPlacementChange({
      ...placement,
      elevationOffset: placement.elevationOffset + (feet * 0.3048),
    });
  };

  const resetSpawnToAnchor = () => {
    const viewer = viewerRef.current;
    if (viewer && spawnEntity.current) viewer.entities.remove(spawnEntity.current);
    spawnEntity.current = undefined;
    setSpawnPoint(null);
  };

  const flyToHouse = () => {
    const viewer = viewerRef.current;
    if (!viewer || !modelUrl || !modelPrimitive.current) return;
    if (!modelPrimitive.current.ready) {
      setModelStatus('Model is still loading…');
      return;
    }
    viewer.camera.flyToBoundingSphere(new BoundingSphere(
      Cartesian3.fromDegrees(placement.longitude, placement.latitude, placedHeight.current + 4),
      Math.max(32, 45 * placement.scale),
    ), {
      duration: 1.2,
      offset: new HeadingPitchRange(CesiumMath.toRadians(placement.heading), CesiumMath.toRadians(-25), Math.max(55, 85 * placement.scale)),
    });
  };

  const adjustInspectionView = (headingChange: number, pitchChange: number) => {
    const viewer = viewerRef.current;
    const model = modelPrimitive.current;
    if (!viewer || !model || !model.ready) return;

    inspectionHeading.current += CesiumMath.toRadians(headingChange);
    inspectionPitch.current = CesiumMath.clamp(
      inspectionPitch.current + CesiumMath.toRadians(pitchChange),
      CesiumMath.toRadians(-80),
      CesiumMath.toRadians(-5),
    );
    viewer.camera.flyToBoundingSphere(new BoundingSphere(
      Cartesian3.fromDegrees(placement.longitude, placement.latitude, placedHeight.current + 4),
      Math.max(32, 45 * placement.scale),
    ), {
      duration: 0.25,
      offset: new HeadingPitchRange(inspectionHeading.current, inspectionPitch.current, Math.max(55, 85 * placement.scale)),
    });
  };

  const enterWalkingMode = () => {
    const viewer = viewerRef.current;
    if (!viewer || !modelUrl) return;
    const model = modelPrimitive.current;
    if (!model?.ready) return;
    const localSpawn = authoredSpawn ? cesiumSpawnFrame(authoredSpawn) : null;
    const entryPosition = localSpawn ? Matrix4.multiplyByPoint(model.modelMatrix,
      new Cartesian3(...localSpawn.position.map((value) => value * model.scale)), new Cartesian3()) : null;
    const entryCartographic = entryPosition ? Cartographic.fromCartesian(entryPosition) : null;
    const start = spawnPoint ? spawnWorldPoint(spawnPoint, placement, placedHeight.current) : entryCartographic ? {
      latitude: CesiumMath.toDegrees(entryCartographic.latitude),
      longitude: CesiumMath.toDegrees(entryCartographic.longitude),
      surfaceHeight: entryCartographic.height,
    } : {
      latitude: placement.latitude,
      longitude: placement.longitude,
      surfaceHeight: placedHeight.current,
    };
    walkCoordinates.current = { latitude: start.latitude, longitude: start.longitude };
    walkHeading.current = CesiumMath.toRadians(placement.heading) + (!spawnPoint && localSpawn ? Math.atan2(localSpawn.direction[0], localSpawn.direction[1]) : 0);
    walkEyeHeight.current = DEFAULT_EYE_HEIGHT;
    walkPitch.current = !spawnPoint && localSpawn ? Math.atan2(localSpawn.direction[2], Math.hypot(localSpawn.direction[0], localSpawn.direction[1])) : 0;
    walkSurfaceHeight.current = start.surfaceHeight;
    walkVerticalOffset.current = 0;
    walkVerticalVelocity.current = 0;
    walkJumpCount.current = 0;
    lastWalkFrame.current = performance.now();
    navigationMode.current = 'walk';
    viewer.camera.setView({
      destination: Cartesian3.fromDegrees(
        start.longitude,
        start.latitude,
        start.surfaceHeight + walkEyeHeight.current,
      ),
      orientation: { heading: walkHeading.current, pitch: walkPitch.current, roll: 0 },
    });
    const pointerLockRequest = viewer.canvas.requestPointerLock();
    if (pointerLockRequest) {
      void pointerLockRequest.catch(() => {
        viewer.scene.screenSpaceCameraController.enableInputs = true;
        setError('Walking mode needs pointer lock. Click Enter walking and allow mouse control.');
      });
    }
  };

  const enterSiteFlight = () => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    const bounded = clampToRectangle(placement.longitude, placement.latitude, projectLimitRectangle(property));
    flightCoordinates.current = bounded;
    const groundPosition = Cartographic.fromDegrees(bounded.longitude, bounded.latitude);
    const groundHeight = viewer.scene.globe.getHeight(groundPosition)
      ?? siteGroundHeight.current;
    flightGroundHeight.current = groundHeight;
    flightHeight.current = FLIGHT_DEFAULT_HEIGHT;
    walkHeading.current = CesiumMath.toRadians(placement.heading);
    walkPitch.current = CesiumMath.toRadians(-18);
    lastWalkFrame.current = performance.now();
    navigationMode.current = 'flight';
    viewer.camera.setView({
      destination: Cartesian3.fromDegrees(
        bounded.longitude,
        bounded.latitude,
        groundHeight + flightHeight.current,
      ),
      orientation: { heading: walkHeading.current, pitch: walkPitch.current, roll: 0 },
    });
    const pointerLockRequest = viewer.canvas.requestPointerLock();
    if (pointerLockRequest) {
      void pointerLockRequest.catch(() => {
        navigationMode.current = null;
        viewer.scene.screenSpaceCameraController.enableInputs = true;
        setError('Site flight needs pointer lock. Click Site flight and allow mouse control.');
      });
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="relative flex min-h-0 flex-1">
      <div ref={container} className="relative min-h-0 min-w-0 flex-1" />
      {!isWalking && !isFlying && <div aria-label="Placement tools" className="w-52 shrink-0 overflow-y-auto overscroll-contain border-l border-white/10 bg-slate-900 p-3 text-sm sm:w-80 sm:p-4">
        <div className="font-semibold">Project model</div>
        <div className="mt-1 truncate text-xs text-slate-400">{fileName || 'Open a GLB above to begin'}</div>
        <details className="mt-4 rounded-lg border border-white/10 bg-white/[0.03]">
          <summary className="cursor-pointer select-none px-3 py-2.5 text-xs font-semibold text-slate-200 hover:text-white">
            Fine-tune placement
          </summary>
          <div className="border-t border-white/10 p-3">
        <div className="grid grid-cols-2 gap-3">
          {([
            ['latitude', 'Latitude', 0.000001],
            ['longitude', 'Longitude', 0.000001],
            ['heading', 'Heading °', 1],
            ['elevationOffset', 'Height offset', 0.1],
            ['scale', 'Scale', 0.01],
          ] as const).map(([key, label, step]) => (
            <label key={key} className={key === 'scale' ? 'col-span-2' : ''}>
              <span className="text-xs text-slate-300">{label}</span>
              <input
                type="number"
                step={step}
                value={placement[key]}
                onChange={(event) => updatePlacement(key, event.target.valueAsNumber)}
                className="mt-1 w-full rounded border border-white/15 bg-slate-900 px-2 py-2 text-xs outline-none focus:border-orange"
              />
            </label>
          ))}
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>Rotate house</span>
            <span>{placement.heading.toFixed(1)}°</span>
          </div>
          <div className="mt-2 grid grid-cols-6 gap-1">
            {[-90, -15, -1, 1, 15, 90].map((degrees) => (
              <button
                key={degrees}
                type="button"
                onClick={() => setHeading(placement.heading + degrees)}
                className="rounded border border-white/15 px-1 py-2 text-[11px] hover:border-orange hover:text-[#F3A06F]"
              >
                {degrees > 0 ? '+' : ''}{degrees}°
              </button>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-4 gap-1">
            {([['N', 0], ['E', 90], ['S', 180], ['W', 270]] as const).map(([label, heading]) => (
              <button
                key={label}
                type="button"
                onClick={() => setHeading(heading)}
                className="rounded border border-white/10 px-2 py-1.5 text-xs text-slate-300 hover:border-orange hover:text-white"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>Move house</span>
            <span>Step: {nudgeFeet} ft</span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1">
            <span />
            <button type="button" aria-label="Move north" onClick={() => nudgePlacement(nudgeFeet, 0)} className="rounded-md border border-orange-300/30 py-2 hover:border-orange-300">N ↑</button>
            <span />
            <button type="button" aria-label="Move west" onClick={() => nudgePlacement(0, -nudgeFeet)} className="rounded-md border border-orange-300/30 py-2 hover:border-orange-300">← W</button>
            <button type="button" aria-label="Move south" onClick={() => nudgePlacement(-nudgeFeet, 0)} className="rounded-md border border-orange-300/30 py-2 hover:border-orange-300">S ↓</button>
            <button type="button" aria-label="Move east" onClick={() => nudgePlacement(0, nudgeFeet)} className="rounded-md border border-orange-300/30 py-2 hover:border-orange-300">E →</button>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1">
            <button type="button" onClick={() => adjustElevation(-nudgeFeet)} className="rounded-md border border-orange-300/30 py-2 text-xs hover:border-orange-300">Drop {nudgeFeet} ft</button>
            <button type="button" onClick={() => adjustElevation(nudgeFeet)} className="rounded-md border border-orange-300/30 py-2 text-xs hover:border-orange-300">Raise {nudgeFeet} ft</button>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1">
            {[1, 5, 10].map((feet) => (
              <button
                key={feet}
                type="button"
                onClick={() => setNudgeFeet(feet)}
                className={`rounded-md border px-2 py-1.5 text-xs ${nudgeFeet === feet ? 'border-orange-300 bg-orange-400/20 text-orange-100' : 'border-white/10 text-slate-400 hover:border-orange-300/60'}`}
              >
                {feet} ft
              </button>
            ))}
          </div>
        </div>
          </div>
        </details>
        <div className="mt-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Camera</div>
          <div className="mt-2 text-xs text-slate-300">Adjust view around house</div>
          <div className="mt-2 grid grid-cols-4 gap-1">
            {([
              ['↶', -15, 0, 'Orbit left'],
              ['↷', 15, 0, 'Orbit right'],
              ['↑', 0, 10, 'Tilt up'],
              ['↓', 0, -10, 'Tilt down'],
            ] as const).map(([label, heading, pitch, title]) => (
              <button
                key={title}
                type="button"
                title={title}
                aria-label={title}
                disabled={modelStatus !== 'Model placed'}
                onClick={() => adjustInspectionView(heading, pitch)}
                className="rounded-md border border-sky-300/30 px-2 py-2 text-base text-sky-100 hover:border-sky-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {embeddedSiteImageNodes.length > 0 && (
          <label className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-sky-300/20 bg-sky-400/5 px-3 py-2.5 text-xs text-slate-200">
            <span>
              <span className="block font-semibold">Embedded site imagery</span>
              <span className="mt-0.5 block text-[11px] text-slate-400">Off by default to prevent overlap with Cesium</span>
            </span>
            <input
              type="checkbox"
              checked={showEmbeddedSiteImagery}
              onChange={(event) => setShowEmbeddedSiteImagery(event.target.checked)}
              className="h-4 w-4 accent-orange"
            />
          </label>
        )}
        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/10 pt-4">
          <div className="col-span-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Explore</div>
          <button
            type="button"
            disabled={!viewerReady}
            onClick={enterSiteFlight}
            className="col-span-2 rounded bg-orange px-3 py-2.5 font-semibold hover:bg-[#a94718] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Enter site flight
          </button>
          <button
            type="button"
            disabled={!modelUrl || modelStatus !== 'Model placed'}
            onClick={flyToHouse}
            className="rounded border border-orange px-3 py-2 font-semibold text-[#F3A06F] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Fly to house
          </button>
          <button
            type="button"
            disabled={!modelUrl || modelStatus !== 'Model placed'}
            onClick={enterWalkingMode}
            className="rounded border border-white/20 px-3 py-2 font-semibold hover:border-orange disabled:cursor-not-allowed disabled:opacity-40"
          >
            Walk house
          </button>
          <div className="col-span-2 mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Model setup</div>
          <button
            type="button"
            onClick={() => {
              setIsChoosingSpawn(false);
              setIsChoosingAnchor((choosing) => !choosing);
            }}
            className={`col-span-2 rounded-lg px-3 py-2 font-semibold ${isChoosingAnchor ? 'bg-orange-500 text-slate-950' : 'border border-orange-300/60 text-orange-200 hover:border-orange-300'}`}
          >
            {isChoosingAnchor ? 'Click terrain now…' : 'Choose anchor on map'}
          </button>
          <button
            type="button"
            disabled={!modelUrl || modelStatus !== 'Model placed'}
            onClick={() => {
              setIsChoosingAnchor(false);
              setIsChoosingSpawn((choosing) => !choosing);
            }}
            className={`col-span-2 rounded-lg px-3 py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${isChoosingSpawn ? 'bg-cyan-400 text-slate-950' : 'border border-cyan-300/60 text-cyan-100 hover:border-cyan-300'}`}
          >
            {isChoosingSpawn ? 'Click a floor or ground point…' : 'Choose FP spawn'}
          </button>
          {spawnPoint && (
            <button
              type="button"
              onClick={resetSpawnToAnchor}
              className="col-span-2 rounded-md border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:border-white/30"
            >
              Reset to model entry
            </button>
          )}
        </div>
        {modelStatus && <div className="mt-2 text-xs text-slate-300">{modelStatus}</div>}
      </div>}
      {(isWalking || isFlying) && <div className="pointer-events-none absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90 shadow" />}
      </div>
      {(isFlying || isWalking) && <div className="shrink-0 border-t border-white/10 bg-slate-950 px-4 py-2 text-xs leading-5 text-slate-200">
        {isFlying ? (
          <>
            <div>WASD/arrows: fly over site</div>
            <div>Shift: move faster</div>
            <div>Q / E: lower / raise altitude</div>
            <div>Mouse: look · Escape: exit</div>
            <div className="mt-1 text-orange-200">Limited to the project area</div>
          </>
        ) : isWalking ? (
          <>
            <div>WASD/arrows: walk</div>
            <div>Space: jump / double jump</div>
            <div>Mouse: look</div>
            <div>Escape: leave walking mode</div>
          </>
        ) : null}
      </div>}
      {!isWalking && !isFlying && (
        <button
          type="button"
          onClick={() => {
            if (viewerRef.current) flyToProperty(viewerRef.current);
          }}
          className="shrink-0 self-end rounded border border-white/20 px-4 py-2 text-xs font-semibold text-white hover:border-orange"
        >
          Reset view
        </button>
      )}
      {error && (
        <div role="alert" className="shrink-0 border-t border-red-400/30 bg-slate-950 px-4 py-2 text-xs text-red-200">
          {error}
        </div>
      )}
    </div>
  );
}

export default function CesiumViewer() {
  const configuredToken = import.meta.env.VITE_CESIUM_ION_TOKEN?.trim() ?? '';
  const presetProperty = useRef(readProjectPreset()).current;
  const [tokenInput, setTokenInput] = useState(configuredToken);
  const [activeToken, setActiveToken] = useState(configuredToken);
  const [property, setProperty] = useState<PropertySite | null>(presetProperty);
  const [parcelInput, setParcelInput] = useState('');
  const [propertyLabel, setPropertyLabel] = useState('');
  const transferId = useRef(new URLSearchParams(window.location.search).get('transfer')).current;
  const [transferNotice, setTransferNotice] = useState('');
  const [isLookingUpParcel, setIsLookingUpParcel] = useState(false);
  const [propertyLookupError, setPropertyLookupError] = useState('');
  const [recentProperties, setRecentProperties] = useState<RecentProperty[]>(readRecentProperties);
  const [modelUrl, setModelUrl] = useState('');
  const [modelBlob, setModelBlob] = useState<Blob | null>(null);
  const [authoredSpawn, setAuthoredSpawn] = useState<ModelSpawn | null>(null);
  useEffect(() => {
    let cancelled = false;
    setAuthoredSpawn(null);
    if (modelBlob) void readGlbModelSpawn(modelBlob).then((spawn) => { if (!cancelled) setAuthoredSpawn(spawn); }).catch(() => { /* Older files may not define a spawn. */ });
    return () => { cancelled = true; };
  }, [modelBlob]);
  const [fileName, setFileName] = useState('');
  const [embeddedSiteImageNodes, setEmbeddedSiteImageNodes] = useState<string[]>([]);
  const [cacheStatus, setCacheStatus] = useState('');
  const [placement, setPlacement] = useState<Placement>({
    latitude: presetProperty?.latitude ?? 0,
    longitude: presetProperty?.longitude ?? 0,
    heading: 0,
    elevationOffset: 0,
    scale: 1,
  });

  useEffect(() => {
    return () => {
      if (modelUrl.startsWith('blob:')) URL.revokeObjectURL(modelUrl);
    };
  }, [modelUrl]);

  useEffect(() => {
    if (!property) return;
    let cancelled = false;
    setCacheStatus('Checking saved project…');
    const restore = async () => {
      if (transferId) {
        const transfer = await readModelTransfer(transferId);
        if (!transfer) throw new Error('Customized model handoff expired. Return to the model viewer and send it again.');
        const prepared = await prepareGlbForCesium(new File([transfer.blob], transfer.fileName, { type: 'model/gltf-binary' }));
        return { blob: prepared.blob, fileName: transfer.fileName, embeddedSiteImageNodes: prepared.embeddedSiteImageNodes, placement: { latitude: property.latitude, longitude: property.longitude, heading: 0, elevationOffset: 0, scale: 1 } };
      }
      return readCachedProjectModel(propertyStorageId(property));
    };
    void restore()
      .then((cached) => {
        if (cancelled) return;
        if (!cached) {
          setCacheStatus('');
          return;
        }
        setPlacement(cached.placement);
        setModelBlob(cached.blob);
        setModelUrl(URL.createObjectURL(cached.blob));
        setFileName(cached.fileName);
        setEmbeddedSiteImageNodes(cached.embeddedSiteImageNodes ?? []);
        setCacheStatus(`Restored ${cached.fileName}`);
      })
      .catch((error) => {
        if (!cancelled) setCacheStatus(error instanceof Error ? error.message : 'Project caching is unavailable in this browser.');
      });
    return () => {
      cancelled = true;
    };
  }, [property, transferId]);

  useEffect(() => {
    if (!property || !modelBlob || !fileName) return;
    const timeout = window.setTimeout(() => {
      void writeCachedProjectModel({
        propertyId: propertyStorageId(property),
        fileName,
        blob: modelBlob,
        embeddedSiteImageNodes,
        placement,
        updatedAt: new Date().toISOString(),
      })
        .then(() => setCacheStatus('Model placement saved in this browser'))
        .catch(() => setCacheStatus('The model is loaded, but browser storage could not save it.'));
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [embeddedSiteImageNodes, fileName, modelBlob, placement, property]);

  useEffect(() => {
    if (!transferId) return;
    let cancelled = false;
    void readModelTransfer(transferId).then((transfer) => {
      if (!cancelled) setTransferNotice(transfer
        ? `${transfer.fileName} is ready. Enter an address to place your customized model.`
        : 'Customized model handoff expired. Return to the model viewer and send it again.');
    }).catch(() => { if (!cancelled) setTransferNotice('The customized model could not be read from browser storage.'); });
    return () => { cancelled = true; };
  }, [transferId]);

  const submitToken = (event: FormEvent) => {
    event.preventDefault();
    setActiveToken(tokenInput.trim());
  };

  const openProperty = (site: PropertySite) => {
    setModelUrl('');
    setModelBlob(null);
    setFileName('');
    setEmbeddedSiteImageNodes([]);
    setProperty(site);
    setPropertyLabel(site.address);
    setParcelInput(site.parcel === 'Not provided' ? '' : site.parcel);
    setPlacement({
      latitude: site.latitude,
      longitude: site.longitude,
      heading: 0,
      elevationOffset: 0,
      scale: 1,
    });
    const siteId = propertyStorageId(site);
    const updated = [
      { site, lastOpenedAt: new Date().toISOString() },
      ...recentProperties.filter((entry) => propertyStorageId(entry.site) !== siteId),
    ].slice(0, MAX_RECENT_PROPERTIES);
    setRecentProperties(updated);
    try {
      window.localStorage.setItem(RECENT_PROPERTIES_KEY, JSON.stringify(updated));
    } catch {
      // Recent locations are an optional convenience when browser storage is available.
    }
  };

  const lookupParcel = async (event: FormEvent) => {
    event.preventDefault();
    const normalizedApn = parcelInput.replace(/[^a-z0-9]/gi, '').toUpperCase();
    const locationSearch = propertyLabel.trim();
    if (!locationSearch) return;
    setIsLookingUpParcel(true);
    setPropertyLookupError('');
    try {
      const geocoderParameters = new URLSearchParams({
        SingleLine: locationSearch,
        outFields: 'Match_addr,Subregion,Region,City,Postal',
        maxLocations: '1',
        f: 'json',
      });
      const geocoderResponse = await fetch(`${WORLD_GEOCODER_URL}?${geocoderParameters.toString()}`);
      if (!geocoderResponse.ok) throw new Error(`Location search returned ${geocoderResponse.status}.`);
      const geocoderData = await geocoderResponse.json() as GeocoderResponse;
      const candidate = geocoderData.candidates?.[0];
      const geocodedLongitude = candidate?.location?.x;
      const geocodedLatitude = candidate?.location?.y;
      if (!Number.isFinite(geocodedLongitude) || !Number.isFinite(geocodedLatitude)) {
        throw new Error('That location could not be found. Include a city, state, or ZIP code.');
      }
      const inferredCounty = candidate?.attributes?.Subregion || '';
      const inferredRegion = candidate?.attributes?.Region || '';
      const inferredJurisdiction = [inferredCounty, inferredRegion].filter(Boolean).join(', ') || 'Location lookup';
      let site: PropertySite = {
        address: candidate?.attributes?.Match_addr || candidate?.address || locationSearch,
        parcel: parcelInput.trim() || 'Not provided',
        statedLotSize: 'Lot size unavailable',
        latitude: geocodedLatitude as number,
        longitude: geocodedLongitude as number,
        boundary: [],
        jurisdiction: inferredJurisdiction,
        sourceUrl: WORLD_GEOCODER_URL,
      };

      if (normalizedApn && /coconino/i.test(inferredCounty)) {
        const parcelParameters = new URLSearchParams({
          where: `APN='${normalizedApn}'`,
          outFields: 'APN,SITUS,SITUS_CITY,Shape__Area',
          returnGeometry: 'true',
          outSR: '4326',
          f: 'geojson',
        });
        const parcelResponse = await fetch(`${COCONINO_PARCEL_QUERY_URL}?${parcelParameters.toString()}`);
        if (parcelResponse.ok) {
          const parcelData = await parcelResponse.json() as ParcelGeoJson;
          const feature = parcelData.features?.[0];
          if (feature?.geometry?.coordinates) {
            const ring = feature.geometry.type === 'MultiPolygon'
              ? (feature.geometry.coordinates as number[][][][])[0]?.[0]
              : (feature.geometry.coordinates as number[][][])[0];
            if (ring && ring.length >= 4) {
              const center = polygonCenter(ring);
              const areaSquareFeet = feature.properties?.Shape__Area;
              const parcel = formatApn(feature.properties?.APN || normalizedApn);
              site = {
                address: feature.properties?.SITUS?.trim() || site.address,
                parcel,
                statedLotSize: areaSquareFeet
                  ? `${Math.round(areaSquareFeet).toLocaleString()} sq ft / ${(areaSquareFeet / 43_560).toFixed(2)} acres (GIS estimate)`
                  : 'Lot size unavailable',
                latitude: center.latitude,
                longitude: center.longitude,
                boundary: ring.flatMap(([longitude, latitude]) => [longitude, latitude]),
                jurisdiction: 'Coconino County, Arizona',
                sourceUrl: COCONINO_PARCEL_SOURCE_URL,
              };
            }
          }
        }
      }
      openProperty(site);
    } catch (caught) {
      setPropertyLookupError(caught instanceof Error ? caught.message : 'The parcel lookup failed.');
    } finally {
      setIsLookingUpParcel(false);
    }
  };

  const openModelFile = async (file: File) => {
    try {
      const preparedGlb = await prepareGlbForCesium(file);
      setModelUrl(URL.createObjectURL(preparedGlb.blob));
      setModelBlob(preparedGlb.blob);
      setFileName(file.name);
      setEmbeddedSiteImageNodes(preparedGlb.embeddedSiteImageNodes);
    } catch (caught) {
      window.alert(caught instanceof Error ? caught.message : 'The GLB could not be prepared for Cesium.');
    }
  };

  const loadModel = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) await openModelFile(file);
  };

  const changeProperty = () => {
    setProperty(null);
    setModelUrl('');
    setModelBlob(null);
    setFileName('');
    setEmbeddedSiteImageNodes([]);
    setCacheStatus('');
    setPropertyLookupError('');
  };

  const exportPlacement = () => {
    if (!property || !fileName) return;
    const payload = {
      format: 'timpson-cesium-placement-v1',
      exportedAt: new Date().toISOString(),
      property: {
        address: property.address,
        parcel: property.parcel,
        latitude: property.latitude,
        longitude: property.longitude,
      },
      model: { fileName },
      placement,
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${propertyStorageId(property).replace(/[^a-z0-9-]+/gi, '-')}-model-placement.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  return (
    <main className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-slate-950 text-white">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
        <div>
          <a href="/viewer" className="text-sm text-[#F3A06F] hover:text-white">
            ← Three.js viewer
          </a>
          <h1 className="mt-1 text-xl font-semibold">Cesium property model viewer</h1>
          {property && <p className="mt-1 text-xs text-slate-400">
            {property.address}{property.parcel !== 'Not provided' ? ` · APN ${property.parcel}` : ''} · {property.statedLotSize}
          </p>}
          <p className="mt-1 text-[11px] text-amber-300/80">
            Placement and any displayed boundary use approximate GIS data.
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {property && fileName && <button
            type="button"
            onClick={exportPlacement}
            className="rounded-lg border border-white/20 px-4 py-3 text-sm font-semibold text-slate-200 hover:border-orange hover:text-white"
          >
            Export placement
          </button>}
          {property && <button
            type="button"
            onClick={changeProperty}
            className="rounded-lg border border-white/20 px-4 py-3 text-sm font-semibold text-slate-200 hover:border-white/40"
          >
            Change property
          </button>}
          <DropboxModelButton onFile={openModelFile} disabled={!property} />
          <label className={`rounded px-5 py-3 font-semibold ${property ? 'cursor-pointer bg-orange hover:bg-[#a94718]' : 'cursor-not-allowed bg-slate-700 text-slate-400'}`}>
            Open house GLB
            <input className="sr-only" type="file" accept=".glb,model/gltf-binary" onChange={loadModel} disabled={!property} />
          </label>
          {property && cacheStatus && <div className="w-full text-right text-[11px] text-slate-400">{cacheStatus}</div>}
        </div>
      </header>

      <section className="relative min-h-0 flex-1">
        {!property ? (
          <div className="flex h-full overflow-y-auto p-6">
            <form onSubmit={lookupParcel} className="mx-auto my-auto w-full max-w-xl rounded-2xl border border-white/10 bg-slate-900 p-7 shadow-2xl">
              <h2 className="text-lg font-semibold">Choose the property</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {transferNotice && <span className="mb-3 block text-[#F3A06F]" role="status">{transferNotice}</span>}
                Search by the project address or location. Add the parcel number when you have it; the viewer will automatically use supported county boundary data when available.
              </p>
              <label className="mt-5 block text-sm font-medium" htmlFor="property-label">Property address or location</label>
              <input
                id="property-label"
                value={propertyLabel}
                onChange={(event) => setPropertyLabel(event.target.value)}
                placeholder="Street address, city, state, or ZIP"
                className="mt-2 w-full rounded border border-white/15 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-orange"
                required
              />
              <label className="mt-4 block text-sm font-medium" htmlFor="parcel-number">Parcel/APN <span className="text-slate-500">(optional)</span></label>
              <input
                id="parcel-number"
                value={parcelInput}
                onChange={(event) => setParcelInput(event.target.value)}
                placeholder="Enter parcel number"
                className="mt-2 w-full rounded border border-white/15 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-orange"
              />
              <button disabled={isLookingUpParcel} className="mt-5 rounded bg-orange px-5 py-3 font-semibold hover:bg-[#a94718] disabled:opacity-50" type="submit">
                {isLookingUpParcel ? 'Finding property…' : 'Open property'}
              </button>
              {propertyLookupError && <div className="mt-4 rounded-lg border border-red-400/30 bg-red-950/30 p-3 text-sm text-red-200">{propertyLookupError}</div>}
              {recentProperties.length > 0 && (
                <div className="mt-6 border-t border-white/10 pt-5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold">Recently viewed</h3>
                    <button
                      type="button"
                      onClick={() => {
                        setRecentProperties([]);
                        window.localStorage.removeItem(RECENT_PROPERTIES_KEY);
                      }}
                      className="text-xs text-slate-500 hover:text-slate-300"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="mt-3 grid gap-2">
                    {recentProperties.map((entry) => (
                      <button
                        key={`${propertyStorageId(entry.site)}:${entry.lastOpenedAt}`}
                        type="button"
                        onClick={() => openProperty(entry.site)}
                        className="rounded border border-white/10 bg-slate-950/60 px-4 py-3 text-left hover:border-orange/70 hover:bg-slate-950"
                      >
                        <span className="block truncate text-sm font-medium text-slate-100">{entry.site.address}</span>
                        <span className="mt-1 block truncate text-xs text-slate-500">
                          {entry.site.parcel !== 'Not provided' ? `APN ${entry.site.parcel} · ` : ''}
                          {new Date(entry.lastOpenedAt).toLocaleDateString()}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <p className="mt-4 text-xs leading-5 text-slate-500">Addresses work broadly. Exact parcel boundaries appear automatically where a compatible public county GIS service is available. All GIS geometry is reference data, not a survey.</p>
            </form>
          </div>
        ) : activeToken ? (
          <Terrain
            authoredSpawn={authoredSpawn}
            property={property}
            token={activeToken}
            modelUrl={modelUrl}
            fileName={fileName}
            embeddedSiteImageNodes={embeddedSiteImageNodes}
            placement={placement}
            onPlacementChange={setPlacement}
          />
        ) : (
          <div className="grid h-full place-items-center p-6">
            <form onSubmit={submitToken} className="w-full max-w-xl rounded-2xl border border-white/10 bg-slate-900 p-7 shadow-2xl">
              <h2 className="text-lg font-semibold">Connect Cesium World Terrain</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Paste your Cesium ion access token. It is used only in this browser session to request terrain and imagery from Cesium.
              </p>
              <label className="mt-5 block text-sm font-medium" htmlFor="cesium-token">Cesium ion access token</label>
              <input
                id="cesium-token"
                type="password"
                value={tokenInput}
                onChange={(event) => setTokenInput(event.target.value)}
                className="mt-2 w-full rounded border border-white/15 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-orange"
                autoComplete="off"
                required
              />
              <button className="mt-4 rounded bg-orange px-5 py-3 font-semibold hover:bg-[#a94718]" type="submit">
                Load terrain
              </button>
            </form>
          </div>
        )}
      </section>
    </main>
  );
}
