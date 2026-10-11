import { AnimationClip, AnimationMixer, LoopOnce, Object3D } from 'three';

export function authoredDoorPlayers(scene: Object3D, clips: AnimationClip[]) {
  const players = new Map<string, { sample: (fraction: number) => void; dispose: () => void; duration: number }>();
  scene.traverse(node => {
    const name = node.userData.animationClip;
    if (node.userData.interactionType !== 'door' || typeof name !== 'string' || players.has(name)) return;
    const clip = clips.find(clip => clip.name === name);
    if (!clip || !Number.isFinite(clip.duration) || clip.duration <= 0) return;
    const mixer = new AnimationMixer(scene), action = mixer.clipAction(clip);
    action.setLoop(LoopOnce, 1); action.clampWhenFinished = true;
    let lastFraction = NaN;
    players.set(name, {
      duration: clip.duration,
      sample(fraction) { const next = Math.max(0, Math.min(1, fraction)); if (next === lastFraction) return; lastFraction = next; action.reset().play(); mixer.setTime(next * clip.duration); },
      dispose() { mixer.stopAllAction(); mixer.uncacheRoot(scene); },
    });
  });
  return players;
}
