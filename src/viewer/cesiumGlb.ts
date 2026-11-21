const CESIUM_UNSUPPORTED_GLTF_EXTENSIONS = new Set(['KHR_lights_punctual']);
const EMBEDDED_SITE_IMAGE_PATTERN = /aerial|orthophoto|ortho photo|satellite|site imagery|parcel imagery/i;

type PreparedGlb = {
  blob: Blob;
  embeddedSiteImageNodes: string[];
};

type TextureInfo = {
  index?: number;
  texCoord?: number;
  extensions?: { KHR_texture_transform?: { texCoord?: number } };
};
type Material = Record<string, unknown> & {
  pbrMetallicRoughness?: Record<string, unknown>;
  extensions?: Record<string, Record<string, unknown>>;
};
type GltfDocument = {
  materials?: Material[];
  meshes?: Array<{ primitives: Array<{ attributes: Record<string, number>; material?: number }> }>;
};

function removeTexturesWithoutCoordinates({ materials, meshes }: GltfDocument): boolean {
  if (!materials || !meshes) return false;
  const originalMaterialCount = materials.length;
  const variants = new Map<string, number>();

  for (const { primitives } of meshes) {
    for (const primitive of primitives) {
      const index = primitive.material;
      if (index === undefined || !materials[index]) continue;

      const uvSets = Object.keys(primitive.attributes).filter((key) => /^TEXCOORD_\d+$/.test(key)).sort();
      const variantKey = `${index}:${uvSets.join(',')}`;
      const cached = variants.get(variantKey);
      if (cached !== undefined) {
        primitive.material = cached;
        continue;
      }

      const material = structuredClone(materials[index]);
      const containers = [material, material.pbrMetallicRoughness, ...Object.values(material.extensions ?? {})];
      let removed = false;
      for (const container of containers) {
        if (!container) continue;
        for (const [slot, value] of Object.entries(container)) {
          if (!slot.endsWith('Texture') || !value || typeof value !== 'object') continue;
          const texture = value as TextureInfo;
          if (!Number.isInteger(texture.index)) continue;
          const coordinates = texture.extensions?.KHR_texture_transform?.texCoord ?? texture.texCoord ?? 0;
          if (uvSets.includes(`TEXCOORD_${coordinates}`)) continue;
          delete container[slot];
          removed = true;
        }
      }

      // The same material can still be used by primitives with the correct UVs.
      const variant = removed ? materials.push(material) - 1 : index;
      variants.set(variantKey, variant);
      primitive.material = variant;
    }
  }
  return materials.length !== originalMaterialCount;
}

export async function prepareGlbForCesium(file: Blob): Promise<PreparedGlb> {
  const header = await file.slice(0, 20).arrayBuffer();
  const view = new DataView(header);
  if (view.byteLength < 20 || view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2) {
    return { blob: file, embeddedSiteImageNodes: [] };
  }

  const jsonLength = view.getUint32(12, true);
  const jsonType = view.getUint32(16, true);
  if (jsonType !== 0x4e4f534a || 20 + jsonLength > file.size) {
    return { blob: file, embeddedSiteImageNodes: [] };
  }

  const json = await file.slice(20, 20 + jsonLength).text();
  const gltf = JSON.parse(json.trim()) as Record<string, unknown>;
  const embeddedSiteImageNodes = Array.isArray(gltf.nodes)
    ? (gltf.nodes as Array<{ name?: unknown }>).flatMap((node) => (
      typeof node.name === 'string' && EMBEDDED_SITE_IMAGE_PATTERN.test(node.name) ? [node.name] : []
    ))
    : [];
  let changed = removeTexturesWithoutCoordinates(gltf as GltfDocument);

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
  const paddedLength = Math.ceil(cleanedJson.length / 4) * 4;
  view.setUint32(8, file.size - jsonLength + paddedLength, true);
  view.setUint32(12, paddedLength, true);
  const padding = new Uint8Array(paddedLength - cleanedJson.length).fill(0x20);
  const blob = new Blob([header, cleanedJson, padding, file.slice(20 + jsonLength)], {
    type: 'model/gltf-binary',
  });
  return { blob, embeddedSiteImageNodes };
}
