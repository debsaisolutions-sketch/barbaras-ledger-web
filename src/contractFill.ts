import { fmtCurrency, fmtDate } from "./helpers";
import { fillContractFromOccupants } from "./occupants";
import type { RentFrequency } from "./rentSchedule";

/** Fields already saved on a property that a contract can copy. */
export type ContractProfile = {
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string;
  coTenantName: string;
  coTenantEmail: string;
  coTenantPhone: string;
  address: string;
  propertyName: string;
  monthlyRent: number;
  rentDueDay: number;
  leaseStartDate: string;
  leaseEndDate: string;
  securityDeposit: number;
  rentFrequency: RentFrequency;
  rentAnchorDate: string;
  rentIntervalDays: number | null;
};

function ordinal(day: number): string {
  const teen = day % 100;
  if (teen >= 11 && teen <= 13) return `${day}th`;
  const last = day % 10;
  if (last === 1) return `${day}st`;
  if (last === 2) return `${day}nd`;
  if (last === 3) return `${day}rd`;
  return `${day}th`;
}

function rentClause(property: ContractProfile): string {
  if (!(property.monthlyRent > 0)) return "";
  const amount = fmtCurrency(property.monthlyRent);
  const start = property.rentAnchorDate || property.leaseStartDate;
  const starting = start ? `, starting ${fmtDate(start)}` : "";
  if (property.rentFrequency === "weekly") return `Tenant agrees to pay ${amount} each week${starting}.`;
  if (property.rentFrequency === "biweekly") return `Tenant agrees to pay ${amount} every two weeks${starting}.`;
  if (property.rentFrequency === "custom") {
    const days =
      property.rentIntervalDays != null && property.rentIntervalDays >= 1
        ? Math.round(property.rentIntervalDays)
        : null;
    const every = days ? `every ${days} days` : "each period";
    return `Tenant agrees to pay ${amount} ${every}${starting}.`;
  }
  const day = property.rentDueDay >= 1 && property.rentDueDay <= 31 ? ordinal(property.rentDueDay) : "";
  if (!day) return `Tenant agrees to pay ${amount} per month.`;
  return `Tenant agrees to pay ${amount} per month, due on the ${day} day of each month.`;
}

/** Copy saved property details into the blanks of a rental, loan, or receipt template. */
export function fillContractFromProperty(text: string, property: ContractProfile): string {
  let next = fillContractFromOccupants(text, property);
  const address = property.address.trim();
  if (address) {
    next = next.replace(/(TENANT:[^\n]*\n)(Address:\s*)_+/, `$1$2${address}`);
    next = next.replace(/PROPERTY ADDRESS:\s*_+/, `PROPERTY ADDRESS: ${address}`);
  }
  const place = property.propertyName.trim() || address;
  if (place) {
    next = next.replace(/PROPERTY\/LOAN:\s*_+/, `PROPERTY/LOAN: ${place}`);
  }
  if (property.leaseStartDate) {
    next = next.replace(/entered into on _+/, `entered into on ${fmtDate(property.leaseStartDate)}`);
  }
  if (property.leaseStartDate || property.leaseEndDate) {
    next = next.replace(/This lease begins on _+ and ends on _+\./, () => {
      const begin = property.leaseStartDate ? fmtDate(property.leaseStartDate) : "_____________";
      const finish = property.leaseEndDate ? fmtDate(property.leaseEndDate) : "_____________";
      return `This lease begins on ${begin} and ends on ${finish}.`;
    });
  }
  const rent = rentClause(property);
  if (rent) {
    next = next.replace(/Tenant agrees to pay \$_+ per month, due on the _+ day of each month\./, rent);
  }
  if (property.securityDeposit > 0) {
    next = next.replace(
      /deposited \$_+ as a security deposit/,
      `deposited ${fmtCurrency(property.securityDeposit)} as a security deposit`
    );
  }
  return next;
}
