// ui/resourcePanel.ts
import type { ResourceNode } from '../world/types';

export function updateResourcePanel(
  resource: ResourceNode | null,
  onBuildRoad: (resource: ResourceNode) => void,
): void {
  const panel = document.getElementById('resource-panel');
  const nameEl = document.getElementById('resource-name');
  const typeEl = document.getElementById('resource-type');
  const amountEl = document.getElementById('resource-amount');
  const regenEl = document.getElementById('resource-regen');
  const buildRoadBtn = document.getElementById('resource-build-road') as HTMLButtonElement | null;

  if (!panel || !nameEl || !typeEl || !amountEl || !regenEl || !buildRoadBtn) {
    return;
  }

  if (!resource) {
    panel.style.display = 'none';
    return;
  }

  panel.style.display = 'block';

  const typeLabel = resource.type.charAt(0).toUpperCase() + resource.type.slice(1);
  nameEl.textContent = `${typeLabel} deposit at (${resource.x}, ${resource.y})`;

  amountEl.textContent =
    `Available: ${Math.floor(resource.current).toLocaleString('en-GB')} / ` +
    `${resource.capacity.toLocaleString('en-GB')}`;
  typeEl.textContent = `Type: ${typeLabel}`;
  regenEl.textContent = `Regen: ${resource.regenPerTick.toLocaleString('en-GB')} units per tick`;

  buildRoadBtn.onclick = () => onBuildRoad(resource);
}
