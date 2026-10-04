import { PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react';

const sendControlKey = (type: 'keydown' | 'keyup', key: string, code = '') => {
  window.dispatchEvent(new KeyboardEvent(type, { key, code, bubbles: true }));
};

// Native non-passive listeners stop long-press selection on mobile Safari.
function useTouchControl<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const prevent = (event: Event) => { if (event.cancelable) event.preventDefault(); };
    element.addEventListener('touchstart', prevent, { passive: false });
    element.addEventListener('touchmove', prevent, { passive: false });
    element.addEventListener('selectstart', prevent);
    element.addEventListener('contextmenu', prevent);
    return () => {
      element.removeEventListener('touchstart', prevent);
      element.removeEventListener('touchmove', prevent);
      element.removeEventListener('selectstart', prevent);
      element.removeEventListener('contextmenu', prevent);
    };
  }, []);
  return ref;
}

export function MobileControl({ label, keyName, code, className = '' }: { label: string; keyName: string; code?: string; className?: string }) {
  const controlRef = useTouchControl<HTMLButtonElement>();
  const handleDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    window.getSelection()?.removeAllRanges();
    event.currentTarget.setPointerCapture(event.pointerId);
    sendControlKey('keydown', keyName, code);
  };
  const handleUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    sendControlKey('keyup', keyName, code);
  };

  return (
    <button
      ref={controlRef}
      type="button"
      aria-label={label}
      className={`grid h-14 w-14 touch-none select-none place-items-center rounded border border-white/25 bg-slate-950/75 text-xl font-bold shadow-xl backdrop-blur active:bg-orange/80 ${className}`}
      onPointerDown={handleDown}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
      onLostPointerCapture={handleUp}
    >
      {label}
    </button>
  );
}

export function MobileJoystick() {
  const controlRef = useTouchControl<HTMLDivElement>();
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const activeKeys = useRef(new Set<string>());

  const updateKeys = (x: number, y: number) => {
    const next = new Set<string>();
    if (y < -0.25) next.add('w');
    if (y > 0.25) next.add('s');
    if (x < -0.25) next.add('a');
    if (x > 0.25) next.add('d');

    for (const key of activeKeys.current) {
      if (!next.has(key)) sendControlKey('keyup', key);
    }
    for (const key of next) {
      if (!activeKeys.current.has(key)) sendControlKey('keydown', key);
    }
    activeKeys.current = next;
  };

  const move = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    const radius = bounds.width / 2;
    let x = event.clientX - (bounds.left + radius);
    let y = event.clientY - (bounds.top + radius);
    const distance = Math.hypot(x, y);
    const travel = radius * 0.58;
    if (distance > travel) {
      x = (x / distance) * travel;
      y = (y / distance) * travel;
    }
    setPosition({ x, y });
    updateKeys(x / travel, y / travel);
  };

  const release = () => {
    for (const key of activeKeys.current) sendControlKey('keyup', key);
    activeKeys.current.clear();
    setPosition({ x: 0, y: 0 });
  };

  return (
    <div
      ref={controlRef}
      role="group"
      aria-label="Movement joystick"
      className="mobile-viewer-joystick relative h-24 w-24 shrink-0 touch-none select-none rounded-full border border-white/25 bg-slate-950/65 shadow-2xl backdrop-blur"
      onPointerDown={(event) => {
        event.preventDefault();
        window.getSelection()?.removeAllRanges();
        event.currentTarget.setPointerCapture(event.pointerId);
        move(event);
      }}
      onPointerMove={move}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
    >
      <div className="pointer-events-none absolute inset-5 rounded-full border border-white/10" />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/35 bg-orange/85 shadow-lg"
        style={{ marginLeft: position.x, marginTop: position.y }}
      />
    </div>
  );
}

