// ui/settlementPanel.ts
import type { Settlement } from '../world/types';

export function updateSettlementPanel(
  settlement: Settlement | null,
  onBuildRoad: (settlement: Settlement) => void,
): void {
  const panel = document.getElementById('settlement-panel');
  const nameEl = document.getElementById('settlement-name');
  const popEl = document.getElementById('settlement-pop');
  const demandEl = document.getElementById('settlement-demand');
  const supplyEl = document.getElementById('settlement-supply');
  const buildRoadBtn = document.getElementById('settlement-build-road') as HTMLButtonElement | null;

  if (!panel || !nameEl || !popEl || !demandEl || !supplyEl || !buildRoadBtn) {
    return;
  }

  if (!settlement) {
    panel.style.display = 'none';
    return;
  }

  panel.style.display = 'block';

  nameEl.textContent = `${settlement.name} (${settlement.size})`;
  popEl.textContent = `Population: ${settlement.population.toLocaleString('en-GB')}`;

  const d = settlement.demand;
  const s = settlement.supply;

  demandEl.textContent = `Demand – pax: ${d.pax}, goods: ${d.goods}, fuel: ${d.fuel}`;
  supplyEl.textContent = `Supply – goods: ${s.goods}, fuel: ${s.fuel}`;

  buildRoadBtn.onclick = () => onBuildRoad(settlement);
}
