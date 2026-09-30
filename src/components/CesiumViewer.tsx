import { ChangeEvent, FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { strToU8, zipSync } from 'fflate';
import {
  Cartographic,
  Cartesian2,
  Cartesian3,
  CameraEventType,
  Color,
  ConstantPositionProperty,
  CubeMapPanorama,
  createWorldTerrainAsync,
  Entity,
  HeadingPitchRange,
  HeadingPitchRoll,
  HeightReference,
  Ion,
  GoogleMaps,
  GoogleStreetViewCubeMapPanoramaProvider,
  KeyboardEventModifier,
  LabelStyle,
  Math as CesiumMath,
  Matrix4,
  Model,
  Ray,
  Resource,
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

const WALK_EYE_HEIGHT = 1.65;
const WALK_SPEED = 4.5;
const JUMP_SPEED = 5.8;
const GRAVITY = 15;
const WALK_COLLISION_PADDING = 0.35;
const MAX_STEP_HEIGHT = 0.75;
const MAX_STEP_DOWN = 0.6;
const STREET_VIEW_CAMERA_HEIGHT = 2.7;
const MODEL_PICK_ID = 'placed-house-model';
const RECENT_PROPERTIES_KEY = 'timpson:cesium-recent-properties:v1';
const MAX_RECENT_PROPERTIES = 8;

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

async function prepareGlbForCesium(file: File) {
  const buffer = await file.arrayBuffer();
  const view = new DataView(buffer);
  if (view.byteLength < 20 || view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2) {
    return file;
  }

  const jsonLength = view.getUint32(12, true);
  const jsonType = view.getUint32(16, true);
  if (jsonType !== 0x4e4f534a || 20 + jsonLength > view.byteLength) return file;

  const bytes = new Uint8Array(buffer);
  const gltf = JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + jsonLength)).trim()) as Record<string, unknown>;
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
  if (!changed) return file;

  const cleanedJson = new TextEncoder().encode(JSON.stringify(gltf));
  if (cleanedJson.length > jsonLength) throw new Error('The Cesium-safe GLB metadata did not fit in the source file.');
  bytes.fill(0x20, 20, 20 + jsonLength);
  bytes.set(cleanedJson, 20);
  return new Blob([bytes], { type: 'model/gltf-binary' });
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

type SavedCamera = {
  position: Cartesian3;
  direction: Cartesian3;
  up: Cartesian3;
};

type StreetViewMatchLocation = {
  latitude: number;
  longitude: number;
  groundHeight: number;
  panoId: string;
};

type StreetViewOption = {
  panoId: string;
  latitude: number;
  longitude: number;
  linkHeading?: number;
};

type StreetViewMetadata = {
  panoId?: string;
  pano_id?: string;
  location?: { lat?: number; lng?: number };
  links?: Array<{
    panoId?: string;
    pano_id?: string;
    pano?: string;
    heading?: number;
  }>;
};

type SavedPlacementCheckpoint = {
  placement: Placement;
  spawnPoint: SpawnPoint | null;
  confirmedAt: string;
};

const placementStorageKey = (parcel: string, fileName: string) => `timpson:cesium-placement:${parcel}:${fileName}`;
const propertyStorageId = (property: PropertySite) => property.parcel !== 'Not provided'
  ? property.parcel
  : `${property.latitude.toFixed(6)},${property.longitude.toFixed(6)}`;

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

function Terrain({ property, token, modelUrl, modelFile, fileName, placement, onPlacementChange }: { property: PropertySite; token: string; modelUrl: string; modelFile: File | null; fileName: string; placement: Placement; onPlacementChange: (placement: Placement) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer>();
  const modelPrimitive = useRef<Model>();
  const anchorEntity = useRef<Entity>();
  const spawnEntity = useRef<Entity>();
  const loadedModelUrl = useRef('');
  const streetViewProvider = useRef<GoogleStreetViewCubeMapPanoramaProvider>();
  const streetViewPanorama = useRef<CubeMapPanorama>();
  const streetViewReturnCamera = useRef<SavedCamera>();
  const streetViewMatchLocation = useRef<StreetViewMatchLocation>();
  const placementRequest = useRef(0);
  const placedHeight = useRef(0);
  const walkKeys = useRef(new Set<string>());
  const walkHeading = useRef(0);
  const walkPitch = useRef(0);
  const walkCoordinates = useRef({ latitude: placement.latitude, longitude: placement.longitude });
  const walkSurfaceHeight = useRef(0);
  const walkVerticalOffset = useRef(0);
  const walkVerticalVelocity = useRef(0);
  const walkJumpCount = useRef(0);
  const lastWalkFrame = useRef(0);
  const inspectionHeading = useRef(CesiumMath.toRadians(placement.heading));
  const inspectionPitch = useRef(CesiumMath.toRadians(-25));
  const [viewerReady, setViewerReady] = useState(false);
  const [isWalking, setIsWalking] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureStatus, setCaptureStatus] = useState('');
  const [isChoosingAnchor, setIsChoosingAnchor] = useState(false);
  const [isChoosingGroundContact, setIsChoosingGroundContact] = useState(false);
  const [isChoosingSpawn, setIsChoosingSpawn] = useState(false);
  const [spawnPoint, setSpawnPoint] = useState<SpawnPoint | null>(null);
  const [modelStatus, setModelStatus] = useState('');
  const [nudgeFeet, setNudgeFeet] = useState(1);
  const [isStreetView, setIsStreetView] = useState(false);
  const [isLoadingStreetView, setIsLoadingStreetView] = useState(false);
  const [streetViewStatus, setStreetViewStatus] = useState('');
  const [streetViewModelOpacity, setStreetViewModelOpacity] = useState(1);
  const [showStreetViewModel, setShowStreetViewModel] = useState(true);
  const [streetViewOptions, setStreetViewOptions] = useState<StreetViewOption[]>([]);
  const [activeStreetViewIndex, setActiveStreetViewIndex] = useState(0);
  const [streetViewHeadHeight, setStreetViewHeadHeight] = useState(STREET_VIEW_CAMERA_HEIGHT);
  const [streetViewFieldOfView, setStreetViewFieldOfView] = useState(80);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!fileName) return;
    try {
      const saved = window.localStorage.getItem(placementStorageKey(propertyStorageId(property), fileName));
      if (!saved) {
        setSpawnPoint(null);
        return;
      }
      const checkpoint = JSON.parse(saved) as SavedPlacementCheckpoint;
      setSpawnPoint(checkpoint.spawnPoint ?? null);
      setCaptureStatus(`Restored confirmed placement from ${new Date(checkpoint.confirmedAt).toLocaleString()}`);
    } catch {
      setSpawnPoint(null);
    }
  }, [fileName, property]);

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
      destination: Cartesian3.fromDegrees(property.longitude, property.latitude, 4200),
      orientation: {
        heading: CesiumMath.toRadians(0),
        pitch: CesiumMath.toRadians(-42),
        roll: 0,
      },
      duration,
    });
  }, [property.latitude, property.longitude]);

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

        viewer.entities.add({
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
      spawnEntity.current = undefined;
      streetViewProvider.current = undefined;
      streetViewPanorama.current = undefined;
      streetViewReturnCamera.current = undefined;
      streetViewMatchLocation.current = undefined;
    };
  }, [flyToProperty, property, token]);

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
    if (!viewerReady || !viewer || !isChoosingGroundContact) return;

    let cancelled = false;
    viewer.screenSpaceEventHandler.setInputAction((movement: { position: Cartesian2 }) => {
      void (async () => {
        const picked = viewer.scene.pick(movement.position) as CesiumRayHit['object'] | undefined;
        const pickedId = picked?.id ?? picked?.primitive?.id;
        const modelPoint = viewer.scene.pickPositionSupported
          ? viewer.scene.pickPosition(movement.position)
          : undefined;
        if (pickedId !== MODEL_PICK_ID || !modelPoint) {
          setError('Click a visible point on the house foundation that should touch the terrain.');
          return;
        }

        try {
          const modelCartographic = Cartographic.fromCartesian(modelPoint);
          const [terrainPoint] = await sampleTerrainMostDetailed(viewer.terrainProvider, [
            Cartographic.fromRadians(modelCartographic.longitude, modelCartographic.latitude),
          ]);
          if (cancelled || viewer.isDestroyed()) return;
          const terrainHeight = terrainPoint.height;
          if (terrainHeight === undefined) throw new Error('Terrain elevation was unavailable at that point.');
          const adjustment = terrainHeight - modelCartographic.height;
          onPlacementChange({
            ...placement,
            elevationOffset: placement.elevationOffset + adjustment,
          });
          setIsChoosingGroundContact(false);
          setCaptureStatus(`Model height adjusted ${(adjustment * 3.28084).toFixed(1)} ft to meet terrain`);
          setError('');
        } catch (caught) {
          setError(caught instanceof Error ? caught.message : 'The model could not be fitted to the terrain.');
        }
      })();
    }, ScreenSpaceEventType.LEFT_CLICK);

    return () => {
      cancelled = true;
      viewer.screenSpaceEventHandler.removeInputAction(ScreenSpaceEventType.LEFT_CLICK);
    };
  }, [isChoosingGroundContact, onPlacementChange, placement, viewerReady]);

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
          const loadedModel = modelPrimitive.current;
          inspectionHeading.current = CesiumMath.toRadians(placement.heading);
          inspectionPitch.current = CesiumMath.toRadians(-25);
          viewer.camera.flyToBoundingSphere(loadedModel.boundingSphere, {
            duration: 1.2,
            offset: new HeadingPitchRange(CesiumMath.toRadians(placement.heading), CesiumMath.toRadians(-25), 0),
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
    if (!viewerReady || !viewer) return;
    const canvas = viewer.canvas;

    const stopWalking = () => {
      walkKeys.current.clear();
      walkVerticalOffset.current = 0;
      walkVerticalVelocity.current = 0;
      walkJumpCount.current = 0;
      viewer.scene.screenSpaceCameraController.enableInputs = true;
      setIsWalking(false);
    };
    const pointerLockChange = () => {
      if (document.pointerLockElement === canvas) {
        lastWalkFrame.current = performance.now();
        viewer.scene.screenSpaceCameraController.enableInputs = false;
        setIsWalking(true);
      } else {
        stopWalking();
      }
    };
    const keyDown = (event: KeyboardEvent) => {
      if (document.pointerLockElement !== canvas) return;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
      if (event.code === 'Space' && !event.repeat && walkJumpCount.current < 2) {
        walkVerticalVelocity.current = JUMP_SPEED;
        walkJumpCount.current += 1;
      }
      walkKeys.current.add(event.key.toLowerCase());
    };
    const keyUp = (event: KeyboardEvent) => walkKeys.current.delete(event.key.toLowerCase());
    const mouseMove = (event: MouseEvent) => {
      if (document.pointerLockElement !== canvas) return;
      walkHeading.current += event.movementX * 0.002;
      walkPitch.current = CesiumMath.clamp(
        walkPitch.current - event.movementY * 0.002,
        CesiumMath.toRadians(-85),
        CesiumMath.toRadians(85),
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
          walkSurfaceHeight.current + WALK_EYE_HEIGHT + walkVerticalOffset.current,
        ),
        orientation: { heading: walkHeading.current, pitch: walkPitch.current, roll: 0 },
      });
    };

    document.addEventListener('pointerlockchange', pointerLockChange);
    document.addEventListener('mousemove', mouseMove);
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    window.addEventListener('blur', stopWalking);
    viewer.clock.onTick.addEventListener(tick);
    return () => {
      document.removeEventListener('pointerlockchange', pointerLockChange);
      document.removeEventListener('mousemove', mouseMove);
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      window.removeEventListener('blur', stopWalking);
      viewer.clock.onTick.removeEventListener(tick);
    };
  }, [placement.elevationOffset, viewerReady]);

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
    viewer.camera.flyToBoundingSphere(modelPrimitive.current.boundingSphere, {
      duration: 1.2,
      offset: new HeadingPitchRange(CesiumMath.toRadians(placement.heading), CesiumMath.toRadians(-25), 0),
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
    viewer.camera.flyToBoundingSphere(model.boundingSphere, {
      duration: 0.25,
      offset: new HeadingPitchRange(inspectionHeading.current, inspectionPitch.current, 0),
    });
  };

  const applyStreetViewMatchCamera = (headHeight = streetViewHeadHeight) => {
    const viewer = viewerRef.current;
    const match = streetViewMatchLocation.current;
    const model = modelPrimitive.current;
    if (!viewer || !match) return;

    const cameraHeightMeters = match.groundHeight + headHeight;
    if (!model?.ready) {
      viewer.camera.lookAtTransform(Matrix4.IDENTITY);
      viewer.camera.setView({
        destination: Cartesian3.fromDegrees(match.longitude, match.latitude, cameraHeightMeters),
        orientation: {
          heading: CesiumMath.toRadians(placement.heading),
          pitch: 0,
          roll: 0,
        },
      });
      viewer.scene.requestRender();
      return;
    }
    const targetCartographic = Cartographic.fromCartesian(model.boundingSphere.center);
    const cameraLatitude = CesiumMath.toRadians(match.latitude);
    const targetLatitude = targetCartographic.latitude;
    const longitudeDelta = targetCartographic.longitude - CesiumMath.toRadians(match.longitude);
    const bearing = Math.atan2(
      Math.sin(longitudeDelta) * Math.cos(targetLatitude),
      (Math.cos(cameraLatitude) * Math.sin(targetLatitude))
        - (Math.sin(cameraLatitude) * Math.cos(targetLatitude) * Math.cos(longitudeDelta)),
    );
    const northMeters = (CesiumMath.toDegrees(targetLatitude) - match.latitude) * 111_320;
    const eastMeters = (CesiumMath.toDegrees(targetCartographic.longitude) - match.longitude)
      * 111_320 * Math.cos(cameraLatitude);
    const horizontalDistance = Math.max(1, Math.hypot(northMeters, eastMeters));
    const pitch = Math.atan2(targetCartographic.height - cameraHeightMeters, horizontalDistance);

    viewer.camera.lookAtTransform(Matrix4.IDENTITY);
    viewer.camera.setView({
      destination: Cartesian3.fromDegrees(match.longitude, match.latitude, cameraHeightMeters),
      orientation: {
        heading: bearing,
        pitch,
        roll: 0,
      },
    });
    viewer.scene.requestRender();
  };

  const applyStreetViewFieldOfView = (fieldOfView: number) => {
    const viewer = viewerRef.current;
    if (!viewer || !('fov' in viewer.camera.frustum)) return;
    viewer.camera.frustum.fov = CesiumMath.toRadians(fieldOfView);
    viewer.scene.requestRender();
  };

  const captureStreetViewMatch = () => {
    const viewer = viewerRef.current;
    const match = streetViewMatchLocation.current;
    if (!viewer || !match) return;
    const remove = viewer.scene.postRender.addEventListener(() => {
      remove();
      viewer.canvas.toBlob((blob) => {
        if (!blob) {
          setError('The browser could not create the Street View reference image.');
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${(fileName || 'house').replace(/\.glb$/i, '')}-street-view-match.png`;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
        setStreetViewStatus('Draft Street View match downloaded');
      }, 'image/png');
    });
    viewer.scene.requestRender();
  };

  const loadStreetViewOption = async (option: StreetViewOption, index: number) => {
    const viewer = viewerRef.current;
    const provider = streetViewProvider.current;
    if (!viewer || !provider) return;

    setIsLoadingStreetView(true);
    setStreetViewStatus(`Loading nearby Street View ${index + 1}…`);
    setError('');
    try {
      const [streetTerrain] = await sampleTerrainMostDetailed(viewer.terrainProvider, [
        Cartographic.fromDegrees(option.longitude, option.latitude),
      ]);
      const groundHeight = streetTerrain.height ?? (placedHeight.current - placement.elevationOffset);
      const panorama = await provider.loadPanorama({
        cartographic: Cartographic.fromDegrees(option.longitude, option.latitude, groundHeight),
        panoId: option.panoId,
      });
      viewer.scene.primitives.add(panorama);
      if (streetViewPanorama.current) viewer.scene.primitives.remove(streetViewPanorama.current);
      streetViewPanorama.current = panorama;
      streetViewMatchLocation.current = {
        latitude: option.latitude,
        longitude: option.longitude,
        groundHeight,
        panoId: option.panoId,
      };
      setActiveStreetViewIndex(index);
      applyStreetViewMatchCamera();
      setStreetViewStatus(`Street View ${index + 1} of ${streetViewOptions.length || 1} · proposed house locked`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'That linked Street View panorama could not be loaded.');
      setStreetViewStatus('The previous Street View remains active');
    } finally {
      setIsLoadingStreetView(false);
    }
  };

  const collectLinkedStreetViews = async (
    provider: GoogleStreetViewCubeMapPanoramaProvider,
    start: StreetViewOption,
  ) => {
    const collected: StreetViewOption[] = [];
    const visited = new Set<string>();
    const queue: StreetViewOption[] = [start];

    while (queue.length && collected.length < 4) {
      const candidate = queue.shift();
      if (!candidate || visited.has(candidate.panoId)) continue;
      visited.add(candidate.panoId);
      try {
        const metadata = await provider.getPanoIdMetadata(candidate.panoId) as StreetViewMetadata;
        const latitude = metadata.location?.lat;
        const longitude = metadata.location?.lng;
        const resolved = Number.isFinite(latitude) && Number.isFinite(longitude)
          ? { ...candidate, latitude: latitude as number, longitude: longitude as number }
          : candidate;
        collected.push(resolved);

        const links = (metadata.links ?? [])
          .map((link) => ({
            panoId: link.panoId ?? link.pano_id ?? link.pano ?? '',
            heading: link.heading,
          }))
          .filter((link) => link.panoId && !visited.has(link.panoId));
        links.sort((a, b) => {
          const incomingHeading = candidate.linkHeading;
          if (incomingHeading === undefined) return 0;
          const angularDifference = (heading?: number) => heading === undefined
            ? 360
            : Math.abs((((heading - incomingHeading) + 540) % 360) - 180);
          return angularDifference(a.heading) - angularDifference(b.heading);
        });
        links.forEach((link) => queue.push({
          panoId: link.panoId,
          latitude: resolved.latitude,
          longitude: resolved.longitude,
          linkHeading: link.heading,
        }));
      } catch {
        collected.push(candidate);
      }
    }
    return collected;
  };

  const exitStreetView = () => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (streetViewPanorama.current) {
      viewer.scene.primitives.remove(streetViewPanorama.current);
      streetViewPanorama.current = undefined;
    }
    viewer.scene.globe.show = true;
    if (modelPrimitive.current) {
      modelPrimitive.current.show = true;
      modelPrimitive.current.color = Color.WHITE.withAlpha(1);
    }
    if (anchorEntity.current) anchorEntity.current.show = true;
    if (spawnEntity.current) spawnEntity.current.show = true;

    const controls = viewer.scene.screenSpaceCameraController;
    controls.enableRotate = true;
    controls.enableTilt = true;
    controls.enableTranslate = true;
    controls.enableZoom = true;
    controls.enableLook = true;

    const savedCamera = streetViewReturnCamera.current;
    viewer.camera.lookAtTransform(Matrix4.IDENTITY);
    if (savedCamera) {
      viewer.camera.setView({
        destination: savedCamera.position,
        orientation: { direction: savedCamera.direction, up: savedCamera.up },
      });
    }
    streetViewReturnCamera.current = undefined;
    streetViewMatchLocation.current = undefined;
    setStreetViewOptions([]);
    setActiveStreetViewIndex(0);
    setIsStreetView(false);
    setStreetViewStatus('Returned to the site model');
  };

  const enterStreetView = async () => {
    const viewer = viewerRef.current;
    if (!viewer || isLoadingStreetView) return;

    if (document.pointerLockElement) document.exitPointerLock();
    setIsLoadingStreetView(true);
    setStreetViewStatus('Finding nearby Street View coverage…');
    setError('');

    try {
      if (!streetViewProvider.current) {
        const ionServer = Ion.defaultServer instanceof Resource
          ? Ion.defaultServer.url
          : Ion.defaultServer;
        const endpoint = `${ionServer.replace(/\/$/, '')}/experimental/panoramas/google`;
        const request = Resource.fetchJson({
          url: endpoint,
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!request) throw new Error('Cesium could not start the Street View request. Please try again.');
        const configuration = await request as { options?: { key?: string; url?: string } };
        if (!configuration.options?.key || !configuration.options.url) {
          throw new Error('This Cesium token does not currently provide Google Street View access.');
        }
        GoogleMaps.defaultStreetViewStaticApiKey = configuration.options.key;
        GoogleMaps.streetViewStaticApiEndpoint = configuration.options.url;
        streetViewProvider.current = await GoogleStreetViewCubeMapPanoramaProvider.fromUrl({});
      }

      const searchPosition = Cartographic.fromDegrees(placement.longitude, placement.latitude, 0);
      const panoramaResult = await streetViewProvider.current.getNearestPanoId(searchPosition, 300) as {
        panoId?: string;
        latitude?: number;
        longitude?: number;
        location?: { lat?: number; lng?: number };
      } | undefined;
      const latitude = panoramaResult?.latitude ?? panoramaResult?.location?.lat;
      const longitude = panoramaResult?.longitude ?? panoramaResult?.location?.lng;
      if (!panoramaResult?.panoId || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        throw new Error('No Google Street View panorama was found within 300 meters of this property.');
      }

      streetViewReturnCamera.current = {
        position: Cartesian3.clone(viewer.camera.positionWC),
        direction: Cartesian3.clone(viewer.camera.directionWC),
        up: Cartesian3.clone(viewer.camera.upWC),
      };
      setStreetViewStatus('Following connected Street View locations…');
      const linkedOptions = await collectLinkedStreetViews(streetViewProvider.current, {
        panoId: panoramaResult.panoId,
        latitude: latitude as number,
        longitude: longitude as number,
      });
      setStreetViewOptions(linkedOptions);

      viewer.scene.globe.show = false;
      if (modelPrimitive.current) {
        modelPrimitive.current.show = Boolean(modelUrl);
        modelPrimitive.current.color = Color.WHITE.withAlpha(streetViewModelOpacity);
      }
      if (anchorEntity.current) anchorEntity.current.show = false;
      if (spawnEntity.current) spawnEntity.current.show = false;

      setShowStreetViewModel(true);
      applyStreetViewFieldOfView(streetViewFieldOfView);
      const controls = viewer.scene.screenSpaceCameraController;
      controls.enableRotate = true;
      controls.enableTilt = true;
      controls.enableTranslate = false;
      controls.enableZoom = false;
      controls.enableLook = true;
      setIsStreetView(true);
      await loadStreetViewOption(linkedOptions[0], 0);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Street View could not be loaded.';
      setError(message);
      setStreetViewStatus('');
      if (streetViewPanorama.current) {
        viewer.scene.primitives.remove(streetViewPanorama.current);
        streetViewPanorama.current = undefined;
      }
      streetViewReturnCamera.current = undefined;
    } finally {
      setIsLoadingStreetView(false);
    }
  };

  const enterWalkingMode = () => {
    const viewer = viewerRef.current;
    if (!viewer || !modelUrl) return;
    const start = spawnPoint ? spawnWorldPoint(spawnPoint, placement, placedHeight.current) : {
      latitude: placement.latitude,
      longitude: placement.longitude,
      surfaceHeight: placedHeight.current,
    };
    walkCoordinates.current = { latitude: start.latitude, longitude: start.longitude };
    walkHeading.current = CesiumMath.toRadians(placement.heading);
    walkPitch.current = 0;
    walkSurfaceHeight.current = start.surfaceHeight;
    walkVerticalOffset.current = 0;
    walkVerticalVelocity.current = 0;
    walkJumpCount.current = 0;
    lastWalkFrame.current = performance.now();
    viewer.camera.setView({
      destination: Cartesian3.fromDegrees(
        start.longitude,
        start.latitude,
        start.surfaceHeight + WALK_EYE_HEIGHT,
      ),
      orientation: { heading: walkHeading.current, pitch: 0, roll: 0 },
    });
    const pointerLockRequest = viewer.canvas.requestPointerLock();
    if (pointerLockRequest) {
      void pointerLockRequest.catch(() => {
        viewer.scene.screenSpaceCameraController.enableInputs = true;
        setError('Walking mode needs pointer lock. Click Enter walking and allow mouse control.');
      });
    }
  };

  const exportBlenderPackage = async () => {
    const viewer = viewerRef.current;
    if (!viewer || !modelUrl || !modelFile || !modelPrimitive.current || isCapturing) return;

    if (document.pointerLockElement) document.exitPointerLock();
    setIsCapturing(true);
    setCaptureStatus('Preparing Blender package…');
    setError('');

    const savedPosition = Cartesian3.clone(viewer.camera.positionWC);
    const savedDirection = Cartesian3.clone(viewer.camera.directionWC);
    const savedUp = Cartesian3.clone(viewer.camera.upWC);
    const savedHeading = viewer.camera.heading;
    const savedPitch = viewer.camera.pitch;
    const savedRoll = viewer.camera.roll;
    const target = Cartesian3.fromDegrees(
      placement.longitude,
      placement.latitude,
      placedHeight.current + (4 * Math.max(placement.scale, 0.25)),
    );
    const range = Math.max(35, 55 * placement.scale);
    const baseName = (fileName.replace(/\.glb$/i, '') || 'house').replace(/[^a-z0-9_-]+/gi, '-');

    const renderPng = () => new Promise<Blob>((resolve, reject) => {
      const remove = viewer.scene.postRender.addEventListener(() => {
        remove();
        viewer.canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('The browser could not create the screenshot.'));
        }, 'image/png');
      });
      viewer.scene.requestRender();
    });

    try {
      const captures: Blob[] = [];
      for (let index = 0; index < 8; index += 1) {
        setCaptureStatus(`Capturing view ${index + 1} of 8…`);
        viewer.camera.lookAt(
          target,
          new HeadingPitchRange(
            CesiumMath.toRadians(index * 45),
            CesiumMath.toRadians(-18),
            range,
          ),
        );
        captures.push(await renderPng());
      }

      setCaptureStatus('Building contact sheet and sampling terrain…');
      const bitmaps = await Promise.all(captures.map((capture) => createImageBitmap(capture)));
      const tileWidth = 640;
      const tileHeight = Math.round(tileWidth * (viewer.canvas.height / viewer.canvas.width));
      const contactSheet = document.createElement('canvas');
      contactSheet.width = tileWidth * 4;
      contactSheet.height = tileHeight * 2;
      const context = contactSheet.getContext('2d');
      if (!context) throw new Error('The browser could not create the contact sheet.');
      bitmaps.forEach((bitmap, index) => {
        const x = (index % 4) * tileWidth;
        const y = Math.floor(index / 4) * tileHeight;
        context.drawImage(bitmap, x, y, tileWidth, tileHeight);
        context.fillStyle = 'rgba(2, 6, 23, 0.72)';
        context.fillRect(x + 12, y + 12, 92, 28);
        context.fillStyle = '#ffffff';
        context.font = '16px sans-serif';
        context.fillText(`${index * 45}°`, x + 24, y + 32);
        bitmap.close();
      });
      const contactSheetBlob = await new Promise<Blob>((resolve, reject) => {
        contactSheet.toBlob((blob) => blob ? resolve(blob) : reject(new Error('The contact sheet could not be encoded.')), 'image/png');
      });

      const gridRadius = 3;
      const spacingMeters = 6;
      const terrainPoints: Array<{
        eastMeters: number;
        northMeters: number;
        latitude: number;
        longitude: number;
        elevationMeters: number;
      }> = [];
      const cartographics: Cartographic[] = [];
      for (let northIndex = -gridRadius; northIndex <= gridRadius; northIndex += 1) {
        for (let eastIndex = -gridRadius; eastIndex <= gridRadius; eastIndex += 1) {
          const northMeters = northIndex * spacingMeters;
          const eastMeters = eastIndex * spacingMeters;
          const latitude = placement.latitude + (northMeters / 111_320);
          const longitude = placement.longitude + (eastMeters / (111_320 * Math.cos(CesiumMath.toRadians(placement.latitude))));
          terrainPoints.push({ eastMeters, northMeters, latitude, longitude, elevationMeters: 0 });
          cartographics.push(Cartographic.fromDegrees(longitude, latitude));
        }
      }
      const sampledTerrain = await sampleTerrainMostDetailed(viewer.terrainProvider, cartographics);
      sampledTerrain.forEach((sample, index) => {
        terrainPoints[index].elevationMeters = sample.height ?? 0;
      });

      const modelBytes = new Uint8Array(await modelFile.arrayBuffer());
      const modelDigest = await crypto.subtle.digest('SHA-256', modelBytes);
      const modelSha256 = Array.from(new Uint8Array(modelDigest), (byte) => byte.toString(16).padStart(2, '0')).join('');
      const cameraCartographic = Cartographic.fromCartesian(savedPosition);
      const currentSpawn = spawnPoint ? spawnWorldPoint(spawnPoint, placement, placedHeight.current) : null;
      const spawnLocalOffset = spawnPoint?.localOffset ?? (currentSpawn ? {
        eastMeters: (currentSpawn.longitude - placement.longitude) * 111_320 * Math.cos(CesiumMath.toRadians(placement.latitude)),
        northMeters: (currentSpawn.latitude - placement.latitude) * 111_320,
        upMeters: currentSpawn.surfaceHeight - placedHeight.current,
      } : null);
      const activeModel = modelPrimitive.current;
      const placementData = {
        schema: 'timpson-site-package-v1',
        exportedAt: new Date().toISOString(),
        model: {
          fileName: modelFile.name,
          bytes: modelFile.size,
          lastModified: new Date(modelFile.lastModified).toISOString(),
          sha256: modelSha256,
        },
        address: property.address,
        parcel: property.parcel,
        statedLotSize: property.statedLotSize,
        jurisdiction: property.jurisdiction,
        parcelSourceUrl: property.sourceUrl,
        placement: {
          ...placement,
          anchorElevationMeters: placedHeight.current,
          groundElevationMeters: placedHeight.current - placement.elevationOffset,
          headingConvention: 'Clockwise degrees from true north',
          modelMatrixEcef: activeModel
            ? Array.from({ length: 16 }, (_, index) => activeModel.modelMatrix[index])
            : null,
        },
        coordinateFrame: {
          origin: 'House SITE_ANCHOR at confirmed latitude, longitude, and anchor elevation',
          units: 'meters',
          xAxis: 'east',
          yAxis: 'north',
          zAxis: 'up',
        },
        firstPersonSpawn: currentSpawn ? { ...currentSpawn, localOffsetFromAnchor: spawnLocalOffset } : null,
        exportCamera: {
          latitude: CesiumMath.toDegrees(cameraCartographic.latitude),
          longitude: CesiumMath.toDegrees(cameraCartographic.longitude),
          elevationMeters: cameraCartographic.height,
          headingDegrees: CesiumMath.toDegrees(savedHeading),
          pitchDegrees: CesiumMath.toDegrees(savedPitch),
          rollDegrees: CesiumMath.toDegrees(savedRoll),
          directionEcef: { x: savedDirection.x, y: savedDirection.y, z: savedDirection.z },
          upEcef: { x: savedUp.x, y: savedUp.y, z: savedUp.z },
        },
        modelBounds: activeModel?.ready ? {
          radiusMeters: activeModel.boundingSphere.radius,
          centerEcef: {
            x: activeModel.boundingSphere.center.x,
            y: activeModel.boundingSphere.center.y,
            z: activeModel.boundingSphere.center.z,
          },
        } : null,
        parcelBoundary: Array.from({ length: property.boundary.length / 2 }, (_, index) => ({
          longitude: property.boundary[index * 2],
          latitude: property.boundary[(index * 2) + 1],
        })),
        captureViews: Array.from({ length: 8 }, (_, index) => ({ headingDegrees: index * 45, pitchDegrees: -18, rangeMeters: range })),
        terrainGrid: { spacingMeters, width: 7, points: terrainPoints },
        accuracyNote: 'Cesium terrain and county parcel data are approximate design-context references, not survey data.',
      };
      const checkpoint: SavedPlacementCheckpoint = {
        placement: { ...placement },
        spawnPoint,
        confirmedAt: placementData.exportedAt,
      };
      try {
        window.localStorage.setItem(placementStorageKey(propertyStorageId(property), modelFile.name), JSON.stringify(checkpoint));
      } catch {
        // The downloaded package remains the durable checkpoint if browser storage is unavailable.
      }
      const readme = `Timpson Blender site proof of concept\n\nImport ${modelFile.name}. Treat SITE_ANCHOR as local 0,0,0 with X east, Y north, Z up. Use placement.json for the confirmed geographic anchor, heading, elevation, scale, model fingerprint, FP spawn, and export camera. Use site-reference.png for visual context. terrain-samples.json contains a 7x7 grid at 6-meter spacing centered on the house anchor. Build a simple low-poly yard surface from the samples, keep the finished floor level, and extend foundation geometry down to meet the sampled terrain. This is design context, not survey-grade grading.\n`;
      const packageBytes = zipSync({
        [modelFile.name]: modelBytes,
        'site-reference.png': new Uint8Array(await contactSheetBlob.arrayBuffer()),
        'placement.json': strToU8(JSON.stringify(placementData, null, 2)),
        'terrain-samples.json': strToU8(JSON.stringify(placementData.terrainGrid, null, 2)),
        'README.txt': strToU8(readme),
      }, { level: 6 });
      const packageUrl = URL.createObjectURL(new Blob([packageBytes], { type: 'application/zip' }));
      const link = document.createElement('a');
      link.href = packageUrl;
      link.download = `${baseName}-blender-site-package.zip`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(packageUrl), 10_000);
      setCaptureStatus('Blender package downloaded');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The Blender package could not be created.');
      setCaptureStatus('');
    } finally {
      viewer.camera.lookAtTransform(Matrix4.IDENTITY);
      viewer.camera.setView({
        destination: savedPosition,
        orientation: { direction: savedDirection, up: savedUp },
      });
      setIsCapturing(false);
    }
  };

  return (
    <div className="relative h-full w-full">
      <div ref={container} className="h-full w-full" />
      {!isStreetView && <div className="absolute left-4 top-4 z-10 max-h-[calc(100%-2rem)] w-72 overflow-y-auto rounded-xl bg-slate-950/85 p-4 text-sm shadow-2xl backdrop-blur">
        <div className="font-semibold">House placement</div>
        <div className="mt-1 truncate text-xs text-slate-400">{fileName || 'Open a GLB above to begin'}</div>
        <div className="mt-4 grid grid-cols-2 gap-3">
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
        <div className="mt-4">
          <div className="text-xs text-slate-300">Adjust view around house</div>
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
        <div className="mt-4 grid grid-cols-2 gap-2">
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
            className="rounded bg-orange px-3 py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-40"
          >
            Enter walking
          </button>
          <button
            type="button"
            onClick={() => {
              setIsChoosingSpawn(false);
              setIsChoosingGroundContact(false);
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
              setIsChoosingGroundContact(false);
              setIsChoosingSpawn((choosing) => !choosing);
            }}
            className={`col-span-2 rounded-lg px-3 py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${isChoosingSpawn ? 'bg-cyan-400 text-slate-950' : 'border border-cyan-300/60 text-cyan-100 hover:border-cyan-300'}`}
          >
            {isChoosingSpawn ? 'Click a floor or ground point…' : 'Choose FP spawn'}
          </button>
          <button
            type="button"
            disabled={!modelUrl || modelStatus !== 'Model placed'}
            onClick={() => {
              setIsChoosingAnchor(false);
              setIsChoosingSpawn(false);
              setIsChoosingGroundContact((choosing) => !choosing);
            }}
            className={`col-span-2 rounded-lg px-3 py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${isChoosingGroundContact ? 'bg-violet-400 text-slate-950' : 'border border-violet-300/60 text-violet-100 hover:border-violet-300'}`}
          >
            {isChoosingGroundContact ? 'Click the foundation point now…' : 'Fit model point to terrain'}
          </button>
          <div className="col-span-2 text-[11px] leading-4 text-slate-400">
            Pick a bottom edge or foundation point that should touch the earth. This adjusts the whole model height.
          </div>
          {spawnPoint && (
            <button
              type="button"
              onClick={resetSpawnToAnchor}
              className="col-span-2 rounded-md border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:border-white/30"
            >
              Reset FP spawn to model anchor
            </button>
          )}
          <button
            type="button"
            disabled={!viewerReady || isLoadingStreetView}
            onClick={() => isStreetView ? exitStreetView() : void enterStreetView()}
            className="col-span-2 rounded-lg border border-sky-300/60 px-3 py-2 font-semibold text-sky-100 hover:border-sky-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isLoadingStreetView
              ? 'Finding Street View…'
              : isStreetView
                ? 'Return to site model'
                : 'View existing Street View'}
          </button>
          <button
            type="button"
            disabled={!modelUrl || modelStatus !== 'Model placed' || isCapturing}
            onClick={() => void exportBlenderPackage()}
            className="col-span-2 rounded border border-white/20 px-3 py-2 font-semibold text-white hover:border-orange disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isCapturing ? 'Building package…' : 'Confirm & export for Blender'}
          </button>
        </div>
        {modelStatus && <div className="mt-2 text-xs text-slate-300">{modelStatus}</div>}
        {captureStatus && <div className="mt-2 text-xs text-[#F3A06F]">{captureStatus}</div>}
        {streetViewStatus && <div className="mt-2 text-xs text-sky-200">{streetViewStatus}</div>}
      </div>}
      {isStreetView && (
        <div className="absolute right-4 top-4 z-10 max-h-[calc(100%-2rem)] w-72 overflow-y-auto rounded-xl bg-slate-950/90 p-4 text-sm shadow-2xl backdrop-blur">
          <div className="font-semibold">Street View photo match</div>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            Draft alignment only. Foreground trees, fences, and the existing building are not automatically masked.
          </p>
          <div className="mt-3 rounded border border-orange/20 bg-orange/10 px-3 py-2 text-xs leading-5 text-white/80">
            The proposed house is locked to its confirmed geographic placement.
          </div>
          <label className="mt-4 block">
            <span className="flex justify-between text-xs text-slate-300">
              <span>Head height</span>
              <span>{(streetViewHeadHeight * 3.28084).toFixed(1)} ft</span>
            </span>
            <input
              type="range"
              min="1.5"
              max="5"
              step="0.1"
              value={streetViewHeadHeight}
              onChange={(event) => {
                const value = event.target.valueAsNumber;
                setStreetViewHeadHeight(value);
                applyStreetViewMatchCamera(value);
              }}
              className="mt-2 w-full accent-orange"
            />
          </label>
          <label className="mt-3 block">
            <span className="flex justify-between text-xs text-slate-300">
              <span>Wider view</span>
              <span>{streetViewFieldOfView.toFixed(0)}°</span>
            </span>
            <input
              type="range"
              min="45"
              max="115"
              step="1"
              value={streetViewFieldOfView}
              onChange={(event) => {
                const value = event.target.valueAsNumber;
                setStreetViewFieldOfView(value);
                applyStreetViewFieldOfView(value);
              }}
              className="mt-2 w-full accent-sky-400"
            />
            <span className="mt-1 block text-[11px] leading-4 text-slate-500">
              A wider lens shows more of the site without moving the house or inventing a new Street View position.
            </span>
          </label>
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>Connected road views</span>
              <span>{streetViewOptions.length || 1} found</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isLoadingStreetView || activeStreetViewIndex <= 0}
                onClick={() => {
                  const index = activeStreetViewIndex - 1;
                  void loadStreetViewOption(streetViewOptions[index], index);
                }}
                className="rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold hover:border-sky-300 disabled:cursor-not-allowed disabled:opacity-35"
              >
                ← Previous
              </button>
              <button
                type="button"
                disabled={isLoadingStreetView || activeStreetViewIndex >= streetViewOptions.length - 1}
                onClick={() => {
                  const index = activeStreetViewIndex + 1;
                  void loadStreetViewOption(streetViewOptions[index], index);
                }}
                className="rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold hover:border-sky-300 disabled:cursor-not-allowed disabled:opacity-35"
              >
                Next →
              </button>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {streetViewOptions.map((option, index) => {
                const northMeters = (option.latitude - placement.latitude) * 111_320;
                const eastMeters = (option.longitude - placement.longitude)
                  * 111_320 * Math.cos(CesiumMath.toRadians(placement.latitude));
                const distanceFeet = Math.round(Math.hypot(northMeters, eastMeters) * 3.28084);
                return (
                  <button
                    key={option.panoId}
                    type="button"
                    disabled={isLoadingStreetView}
                    onClick={() => void loadStreetViewOption(option, index)}
                    className={`rounded-md border px-2 py-2 text-left text-[11px] disabled:opacity-40 ${index === activeStreetViewIndex ? 'border-sky-300 bg-sky-400/15 text-sky-100' : 'border-white/10 text-slate-300 hover:border-sky-300/60'}`}
                  >
                    <span className="block font-semibold">Road stop {index + 1}</span>
                    <span className="text-slate-500">about {distanceFeet} ft away</span>
                  </button>
                );
              })}
            </div>
            {streetViewOptions.length <= 1 && (
              <p className="mt-2 text-[11px] leading-4 text-amber-200/80">
                Google returned this panorama but no connected road links through Cesium, so only the nearest real view is available.
              </p>
            )}
          </div>
          <label className="mt-4 block">
            <span className="flex justify-between text-xs text-slate-300">
              <span>Proposed model opacity</span>
              <span>{Math.round(streetViewModelOpacity * 100)}%</span>
            </span>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={streetViewModelOpacity}
              onChange={(event) => {
                const value = event.target.valueAsNumber;
                setStreetViewModelOpacity(value);
                if (modelPrimitive.current) modelPrimitive.current.color = Color.WHITE.withAlpha(value);
                viewerRef.current?.scene.requestRender();
              }}
              className="mt-2 w-full accent-violet-400"
            />
          </label>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={!modelUrl}
              onClick={() => {
                const next = !showStreetViewModel;
                setShowStreetViewModel(next);
                if (modelPrimitive.current) modelPrimitive.current.show = next;
                viewerRef.current?.scene.requestRender();
              }}
              className="rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold hover:border-violet-300 disabled:opacity-40"
            >
              {showStreetViewModel ? 'Hide proposal' : 'Show proposal'}
            </button>
            <button
              type="button"
              onClick={() => applyStreetViewMatchCamera()}
              className="rounded border border-white/20 px-3 py-2 text-xs font-semibold hover:border-orange"
            >
              Re-aim at house
            </button>
            <button
              type="button"
              onClick={captureStreetViewMatch}
              className="col-span-2 rounded bg-orange px-3 py-2 font-semibold hover:bg-[#a94718]"
            >
              Capture matched view
            </button>
          </div>
        </div>
      )}
      <div className="pointer-events-none absolute bottom-5 left-5 rounded-xl bg-slate-950/80 px-4 py-3 text-xs leading-5 text-slate-200 shadow-xl backdrop-blur">
        {isStreetView ? (
          <>
            <div>Drag: look around existing conditions</div>
            <div>Shift + drag: tilt</div>
            <div>Use the panel to return to the model</div>
          </>
        ) : isWalking ? (
          <>
            <div>WASD/arrows: walk</div>
            <div>Space: jump / double jump</div>
            <div>Mouse: look</div>
            <div>Escape: leave walking mode</div>
          </>
        ) : (
          <>
            <div>Drag: rotate</div>
            <div>Two-finger scroll/pinch: zoom</div>
            <div>Shift + drag: tilt</div>
            <div>Control + drag: look</div>
          </>
        )}
      </div>
      {isWalking && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90 shadow" />
      )}
      <button
        type="button"
        onClick={() => {
          if (isStreetView) exitStreetView();
          else if (viewerRef.current) flyToProperty(viewerRef.current);
        }}
        className="absolute bottom-5 right-5 rounded bg-orange px-4 py-3 text-sm font-semibold text-white shadow-xl hover:bg-[#a94718]"
      >
        Reset view
      </button>
      {error && (
        <div className="absolute left-1/2 top-6 max-w-lg -translate-x-1/2 rounded-xl border border-red-400/40 bg-slate-950/90 px-5 py-4 text-sm text-red-200 shadow-2xl">
          {error}
        </div>
      )}
    </div>
  );
}

export default function CesiumViewer() {
  const configuredToken = import.meta.env.VITE_CESIUM_ION_TOKEN?.trim() ?? '';
  const [tokenInput, setTokenInput] = useState(configuredToken);
  const [activeToken, setActiveToken] = useState(configuredToken);
  const [property, setProperty] = useState<PropertySite | null>(null);
  const [parcelInput, setParcelInput] = useState('');
  const [propertyLabel, setPropertyLabel] = useState('');
  const [isLookingUpParcel, setIsLookingUpParcel] = useState(false);
  const [propertyLookupError, setPropertyLookupError] = useState('');
  const [recentProperties, setRecentProperties] = useState<RecentProperty[]>(readRecentProperties);
  const [modelUrl, setModelUrl] = useState('');
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [placement, setPlacement] = useState<Placement>({
    latitude: 0,
    longitude: 0,
    heading: 0,
    elevationOffset: 0,
    scale: 1,
  });

  useEffect(() => {
    return () => {
      if (modelUrl.startsWith('blob:')) URL.revokeObjectURL(modelUrl);
    };
  }, [modelUrl]);

  const submitToken = (event: FormEvent) => {
    event.preventDefault();
    setActiveToken(tokenInput.trim());
  };

  const openProperty = (site: PropertySite) => {
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
        parcel: normalizedApn ? formatApn(normalizedApn) : 'Not provided',
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

  const loadModel = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const cesiumSafeGlb = await prepareGlbForCesium(file);
      const savedCheckpoint = property
        ? window.localStorage.getItem(placementStorageKey(propertyStorageId(property), file.name))
        : null;
      if (savedCheckpoint) {
        const checkpoint = JSON.parse(savedCheckpoint) as SavedPlacementCheckpoint;
        if (checkpoint.placement && Object.values(checkpoint.placement).every(Number.isFinite)) {
          setPlacement(checkpoint.placement);
        }
      }
      setModelUrl(URL.createObjectURL(cesiumSafeGlb));
      setModelFile(file);
      setFileName(file.name);
    } catch (caught) {
      window.alert(caught instanceof Error ? caught.message : 'The GLB could not be prepared for Cesium.');
    }
  };

  const changeProperty = () => {
    setProperty(null);
    setModelUrl('');
    setModelFile(null);
    setFileName('');
    setPropertyLookupError('');
  };

  return (
    <main className="flex h-screen min-h-0 flex-col overflow-hidden bg-slate-950 text-white">
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
        <div className="flex gap-2">
          {property && <button
            type="button"
            onClick={changeProperty}
            className="rounded-lg border border-white/20 px-4 py-3 text-sm font-semibold text-slate-200 hover:border-white/40"
          >
            Change property
          </button>}
          <label className={`rounded px-5 py-3 font-semibold ${property ? 'cursor-pointer bg-orange hover:bg-[#a94718]' : 'cursor-not-allowed bg-slate-700 text-slate-400'}`}>
            Open house GLB
            <input className="sr-only" type="file" accept=".glb,model/gltf-binary" onChange={loadModel} disabled={!property} />
          </label>
        </div>
      </header>

      <section className="relative min-h-0 flex-1">
        {!property ? (
          <div className="flex h-full overflow-y-auto p-6">
            <form onSubmit={lookupParcel} className="mx-auto my-auto w-full max-w-xl rounded-2xl border border-white/10 bg-slate-900 p-7 shadow-2xl">
              <h2 className="text-lg font-semibold">Choose the property</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
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
            property={property}
            token={activeToken}
            modelUrl={modelUrl}
            modelFile={modelFile}
            fileName={fileName}
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
