"use client";

// ============================================================
// EmiCalculator — interactive home-loan estimate for a listing.
// Sliders for down payment, interest rate and tenure; the
// monthly EMI is computed with the standard reducing-balance
// formula. Indicative only — final terms come from the lender.
// ============================================================

import { useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { formatPrice, formatPriceFull } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Standard EMI: P × r × (1+r)^n / ((1+r)^n − 1), r = monthly rate. */
function monthlyEmi(principal: number, annualRatePct: number, years: number): number {
  const r = annualRatePct / 12 / 100;
  const n = years * 12;
  if (principal <= 0 || n <= 0) return 0;
  if (r === 0) return principal / n;
  const pow = Math.pow(1 + r, n);
  return (principal * r * pow) / (pow - 1);
}

export function EmiCalculator({ price }: { price: number }) {
  const [downPct, setDownPct] = useState(20);
  const [rate, setRate] = useState(8.5);
  const [years, setYears] = useState(20);

  const { loanAmount, emi, totalInterest, totalPayable, downPayment } = useMemo(() => {
    const down = Math.round((price * downPct) / 100);
    const loan = Math.max(price - down, 0);
    const e = monthlyEmi(loan, rate, years);
    return {
      loanAmount: loan,
      downPayment: down,
      emi: Math.round(e),
      totalInterest: Math.round(e * years * 12 - loan),
      totalPayable: Math.round(e * years * 12 + down),
    };
  }, [price, downPct, rate, years]);

  return (
    <section
      aria-labelledby="emi-heading"
      className="rounded-xl border bg-card p-4 shadow-sm sm:p-6"
    >
      <div className="flex items-center gap-2">
        <Calculator className="size-4 text-primary" aria-hidden="true" />
        <h2 id="emi-heading" className="font-display text-lg font-semibold text-foreground">
          Home loan EMI
        </h2>
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Estimated monthly EMI
          </p>
          <p className="mt-1 font-display text-3xl font-semibold tracking-tight text-primary">
            {formatPrice(emi)}
            <span className="ml-1 text-sm font-medium text-muted-foreground">/month</span>
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          {formatPriceFull(loanAmount)} loan · {downPct}% down
        </p>
      </div>

      <div className="mt-6 space-y-6">
        {/* Down payment */}
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="emi-down" className="text-sm font-medium text-foreground">
              Down payment
            </label>
            <span className="text-sm font-medium text-foreground">
              {formatPrice(downPayment)}
              <span className="ml-1 text-xs font-normal text-muted-foreground">({downPct}%)</span>
            </span>
          </div>
          <Slider
            id="emi-down"
            value={[downPct]}
            onValueChange={(v) => setDownPct(v[0] ?? 20)}
            min={10}
            max={60}
            step={5}
            className="mt-3"
            aria-label="Down payment percentage"
          />
          <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
            <span>10%</span>
            <span>60%</span>
          </div>
        </div>

        {/* Interest rate */}
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="emi-rate" className="text-sm font-medium text-foreground">
              Interest rate
            </label>
            <span className="text-sm font-medium text-foreground" aria-live="polite">
              {rate.toFixed(1)}% p.a.
            </span>
          </div>
          <Slider
            id="emi-rate"
            value={[rate]}
            onValueChange={(v) => setRate(v[0] ?? 8.5)}
            min={6}
            max={14}
            step={0.1}
            className="mt-3"
            aria-label="Annual interest rate"
          />
          <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
            <span>6%</span>
            <span>14%</span>
          </div>
        </div>

        {/* Tenure */}
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="emi-tenure" className="text-sm font-medium text-foreground">
              Loan tenure
            </label>
            <span className="text-sm font-medium text-foreground">
              {years} {years === 1 ? "year" : "years"}
            </span>
          </div>
          <Slider
            id="emi-tenure"
            value={[years]}
            onValueChange={(v) => setYears(v[0] ?? 20)}
            min={5}
            max={30}
            step={1}
            className="mt-3"
            aria-label="Loan tenure in years"
          />
          <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
            <span>5 yrs</span>
            <span>30 yrs</span>
          </div>
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-3 border-t pt-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Loan amount
          </dt>
          <dd className="mt-0.5 font-medium text-foreground">{formatPrice(loanAmount)}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Total interest
          </dt>
          <dd className="mt-0.5 font-medium text-foreground">{formatPrice(totalInterest)}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Total payable
          </dt>
          <dd className="mt-0.5 font-medium text-foreground">{formatPrice(totalPayable)}</dd>
        </div>
      </dl>

      <p className={cn("mt-4 text-[11px] leading-relaxed text-muted-foreground")}>
        Indicative estimate only. Your lender&rsquo;s final rate, processing fees and eligibility
        may change these figures.
      </p>
    </section>
  );
}
