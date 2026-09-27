export type Occupant = {
  name: string;
  email: string;
  phone: string;
};

type OccupantSource = {
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string;
  coTenantName: string;
  coTenantEmail: string;
  coTenantPhone: string;
};

export function leaseOccupants(property: OccupantSource): Occupant[] {
  return [
    {
      name: property.tenantName.trim(),
      email: property.tenantEmail.trim(),
      phone: property.tenantPhone.trim(),
    },
    {
      name: property.coTenantName.trim(),
      email: property.coTenantEmail.trim(),
      phone: property.coTenantPhone.trim(),
    },
  ].filter((person) => person.name || person.email || person.phone);
}

export function occupantLabel(property: OccupantSource): string {
  const names = leaseOccupants(property)
    .map((person) => person.name)
    .filter(Boolean);
  return names.join(" and ");
}

function contactLine(people: Occupant[], field: "phone" | "email"): string {
  return people
    .filter((person) => person[field])
    .map((person) => (person.name ? `${person.name} ${person[field]}` : person[field]))
    .join("; ");
}

/** Fill tenant blanks with each adult on the lease. */
export function fillContractFromOccupants(text: string, property: OccupantSource): string {
  const people = leaseOccupants(property);
  const names = people.map((person) => person.name).filter(Boolean);
  const phones = contactLine(people, "phone");
  const emails = contactLine(people, "email");
  let next = text;
  if (names.length > 0) {
    const joined = names.join(" and ");
    next = next.replace(/TENANT:\s*_+/, `TENANT: ${joined}`);
    next = next.replace(/BORROWER:\s*_+/, `BORROWER: ${joined}`);
    next = next.replace(/RECEIVED FROM:\s*_+/, `RECEIVED FROM: ${joined}`);
  }
  if (phones) {
    next = next.replace(/(TENANT:[^\n]*\n(?:Address:[^\n]*\n)?)(Phone:\s*)_+/, `$1$2${phones}`);
  }
  if (emails && !/\nEmail:/.test(next.slice(next.indexOf("TENANT:")))) {
    next = next.replace(
      /(TENANT:[^\n]*\n(?:Address:[^\n]*\n)?Phone:[^\n]*)/,
      `$1\nEmail: ${emails}`
    );
  }
  return next;
}
