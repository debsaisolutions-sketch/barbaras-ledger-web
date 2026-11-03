import { describe, expect, it } from "vitest";
import type { BalanceProperty, BalanceTransaction } from "./tenantBalances";
import {
  matchesPropertyStatusFilter,
  owedOnSchedule,
  propertyListStatus,
  summarizePropertyMoney,
  transactionBelongsToPriorTenant,
  unpaidRentForProperties,
} from "./tenantBalances";

const today = "2026-11-03";

function property(partial: Partial<BalanceProperty> & Pick<BalanceProperty, "id" | "propertyName">): BalanceProperty {
  return {
    tenantName: "",
    coTenantName: "",
    priorTenantName: "",
    leaseStartDate: "",
    rentFrequency: "monthly",
    monthlyRent: 0,
    rentDueDay: 1,
    rentAnchorDate: "",
    rentIntervalDays: null,
    skippedRentPeriods: [],
    status: "Active",
    ...partial,
  };
}

function txn(
  partial: Partial<BalanceTransaction> & Pick<BalanceTransaction, "propertyId" | "date">
): BalanceTransaction {
  return {
    type: "payment",
    applyTo: "Rent",
    chargeAmount: 0,
    paymentAmount: 0,
    rentPeriodStart: "",
    rentPeriodEnd: "",
    voidedAt: "",
    tenantName: "",
    ...partial,
  };
}

describe("per-tenant balances", () => {
  const rv = property({
    id: "rv",
    propertyName: "RV",
    tenantName: "Chris Campbell",
    coTenantName: "Madesyn Jones",
    priorTenantName: "Connie Williams",
    leaseStartDate: "2026-09-19",
    rentFrequency: "biweekly",
    monthlyRent: 400,
    rentAnchorDate: "2026-09-23",
  });
  const downstairs = property({
    id: "down",
    propertyName: "Downstairs",
    tenantName: "Connie Williams",
    leaseStartDate: "2026-09-19",
    rentFrequency: "monthly",
    monthlyRent: 200,
  });

  const rows: BalanceTransaction[] = [
    txn({
      id: "rv-charge",
      propertyId: "rv",
      date: "2026-01-15",
      type: "charge",
      chargeAmount: 5000,
    }),
    txn({
      id: "rv-old-pay",
      propertyId: "rv",
      date: "2026-06-01",
      paymentAmount: 1040.52,
    }),
    txn({ id: "chris-1", propertyId: "rv", date: "2026-09-24", paymentAmount: 300 }),
    txn({ id: "chris-2", propertyId: "rv", date: "2026-10-07", paymentAmount: 400 }),
    txn({ id: "chris-3", propertyId: "rv", date: "2026-10-21", paymentAmount: 400 }),
    txn({
      id: "down-charge",
      propertyId: "down",
      date: "2026-09-20",
      type: "charge",
      chargeAmount: 200,
    }),
  ];

  it("keeps Connie's RV shortfall off Chris and Madesyn, and rolls it into her total", () => {
    const summary = summarizePropertyMoney([rv, downstairs], rows, today);
    const rvMoney = summary.find((row) => row.propertyId === "rv");
    const downMoney = summary.find((row) => row.propertyId === "down");
    expect(rvMoney?.priorBalance).toBe(3959.48);
    expect(rvMoney?.currentBalance).toBe(100);
    expect(rvMoney?.householdBalance).toBe(100);
    expect(rvMoney?.includedOn.map((home) => home.propertyName)).toEqual(["Downstairs"]);
    expect(downMoney?.currentBalance).toBe(200);
    expect(downMoney?.householdBalance).toBe(4159.48);
    expect(downMoney?.carried).toEqual([
      { propertyId: "rv", propertyName: "RV", amount: 3959.48, tenantName: "Connie Williams" },
    ]);
    expect(unpaidRentForProperties([rv, downstairs], summary)).toBe(4259.48);
    expect(rvMoney && rvMoney.priorBalance + rvMoney.currentBalance).not.toBe(2859.48);
  });

  it("counts the partly paid September period after later periods are paid", () => {
    const owed = owedOnSchedule(
      {
        frequency: "biweekly",
        expectedAmount: 400,
        dueDay: 1,
        anchorDate: "2026-09-23",
        intervalDays: null,
        leaseStart: "2026-09-19",
      },
      rows.filter((row) => row.propertyId === "rv" && row.date >= "2026-09-19"),
      today
    );
    expect(owed).toBe(100);
  });

  it("lets a saved tenant name override the lease date", () => {
    expect(
      transactionBelongsToPriorTenant({
        date: "2026-10-01",
        tenantName: "Connie Williams",
        leaseStart: "2026-09-19",
        priorTenantName: "Connie Williams",
        currentTenantNames: ["Chris Campbell", "Madesyn Jones"],
      })
    ).toBe(true);
    expect(
      transactionBelongsToPriorTenant({
        date: "2026-01-01",
        tenantName: "Chris Campbell",
        leaseStart: "2026-09-19",
        priorTenantName: "Connie Williams",
        currentTenantNames: ["Chris Campbell", "Madesyn Jones"],
      })
    ).toBe(false);
  });

  it("treats Connie Pryor and Connie Williams as the same tenant", () => {
    const rvPryor = { ...rv, priorTenantName: "Connie Pryor" };
    const summary = summarizePropertyMoney([rvPryor, downstairs], rows, today);
    const downMoney = summary.find((row) => row.propertyId === "down");
    const rvMoney = summary.find((row) => row.propertyId === "rv");
    expect(downMoney?.carried).toEqual([
      { propertyId: "rv", propertyName: "RV", amount: 3959.48, tenantName: "Connie Williams" },
    ]);
    expect(rvMoney?.includedOn.map((home) => home.propertyName)).toEqual(["Downstairs"]);
    expect(rvMoney?.currentBalance).toBe(100);
    expect(propertyListStatus({ status: "Active", carried: downMoney?.carried ?? [] })).toBe("Past Due");
    expect(propertyListStatus({ status: "Active", carried: rvMoney?.carried ?? [] })).toBe("Active");
    expect(matchesPropertyStatusFilter({ status: "Active", carried: downMoney?.carried ?? [] }, "Past Due")).toBe(
      true
    );
    expect(matchesPropertyStatusFilter({ status: "Active", carried: downMoney?.carried ?? [] }, "Active")).toBe(
      false
    );
    expect(matchesPropertyStatusFilter({ status: "Active", carried: [] }, "Past Due")).toBe(false);
    expect(propertyListStatus({ status: "Sold", carried: downMoney?.carried ?? [] })).toBe("Sold");
  });

  it("uses the November 3 payment on the earlier shortfall, not as a credit", () => {
    const withCash = [
      ...rows,
      txn({ id: "chris-4", propertyId: "rv", date: "2026-11-03", paymentAmount: 100 }),
    ];
    const summary = summarizePropertyMoney([rv, downstairs], withCash, today);
    const rvMoney = summary.find((row) => row.propertyId === "rv");
    const downMoney = summary.find((row) => row.propertyId === "down");
    expect(rvMoney?.currentBalance).toBe(0);
    expect(rvMoney?.householdBalance).toBe(0);
    expect(rvMoney?.priorBalance).toBe(3959.48);
    expect(downMoney?.carried[0].amount).toBe(3959.48);
    expect(unpaidRentForProperties([rv, downstairs], summary)).toBe(4159.48);
  });

  it("keeps a real October 31 balance when that period is the one on the schedule", () => {
    const leaseAnchored = {
      ...rv,
      rentAnchorDate: "2026-09-19",
    };
    const currentPays = [
      txn({ id: "chris-1", propertyId: "rv", date: "2026-09-24", paymentAmount: 300 }),
      txn({ id: "chris-2", propertyId: "rv", date: "2026-10-07", paymentAmount: 400 }),
      txn({ id: "chris-3", propertyId: "rv", date: "2026-10-21", paymentAmount: 400 }),
      txn({ id: "chris-4", propertyId: "rv", date: "2026-11-03", paymentAmount: 100 }),
    ];
    const owed = owedOnSchedule(
      {
        frequency: "biweekly",
        expectedAmount: 400,
        dueDay: 1,
        anchorDate: "2026-09-19",
        intervalDays: null,
        leaseStart: "2026-09-19",
      },
      currentPays,
      today
    );
    expect(owed).toBe(400);
    const summary = summarizePropertyMoney([leaseAnchored], currentPays, today);
    expect(summary[0].currentBalance).toBe(400);
  });

  it("drops a voided prorated charge from the unit and from back rent", () => {
    const summary = summarizePropertyMoney(
      [downstairs, rv],
      [
        ...rows,
        txn({
          id: "void-prorate",
          propertyId: "down",
          date: "2026-09-20",
          type: "charge",
          chargeAmount: 400,
          voidedAt: "2026-09-21T00:00:00Z",
        }),
        txn({
          id: "void-prior",
          propertyId: "rv",
          date: "2026-01-20",
          type: "charge",
          chargeAmount: 400,
          voidedAt: "2026-01-21T00:00:00Z",
        }),
      ],
      today
    );
    const downMoney = summary.find((row) => row.propertyId === "down");
    const rvMoney = summary.find((row) => row.propertyId === "rv");
    expect(downMoney?.currentBalance).toBe(200);
    expect(rvMoney?.priorBalance).toBe(3959.48);
    expect(downMoney?.carried[0].amount).toBe(3959.48);
  });

  it("applies rent paid beyond the current lease to that person's back rent", () => {
    const summary = summarizePropertyMoney(
      [rv, downstairs],
      [
        ...rows,
        txn({ id: "down-pay", propertyId: "down", date: "2026-10-01", paymentAmount: 250 }),
      ],
      today
    );
    const downMoney = summary.find((row) => row.propertyId === "down");
    expect(downMoney?.currentBalance).toBe(0);
    expect(downMoney?.carried[0].amount).toBe(3909.48);
    expect(summary.find((row) => row.propertyId === "rv")?.priorBalance).toBe(3909.48);
  });

  it("matches a prior tenant name without caring about case", () => {
    const renamed = { ...downstairs, tenantName: "connie williams" };
    const summary = summarizePropertyMoney([rv, renamed], rows, today);
    expect(summary.find((row) => row.propertyId === "down")?.householdBalance).toBe(4159.48);
  });
});
