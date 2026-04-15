"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Search, Loader2, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWizard } from "./context";

// Comprehensive UK VRN regex: current, prefix, suffix, dateless, Northern Ireland.
const UK_VRN_RE =
  /^([A-Z]{2}\d{2}\s?[A-Z]{3})|([A-Z]\d{1,3}\s?[A-Z]{3})|([A-Z]{3}\s?\d{1,3}[A-Z])|([A-Z]{1,2}\s?\d{1,4})|(\d{1,4}\s?[A-Z]{1,2})|([A-Z]{1,3}\s?\d{1,3})|(\d{1,3}\s?[A-Z]{1,3})|([A-Z]{3}\s?\d{1,4})$/i;

function cleanReg(v: string): string {
  return v.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 7);
}

export function Step3Vehicle() {
  const { state, update, setStep } = useWizard();
  const [localError, setLocalError] = useState<string | null>(null);

  const reg = state.vehicleReg;

  async function lookup() {
    setLocalError(null);
    const clean = cleanReg(reg);
    if (clean.length < 2 || !UK_VRN_RE.test(clean)) {
      setLocalError("Please enter a valid UK registration number");
      return;
    }

    update({ dvlaLoading: true, dvlaError: null, dvlaData: null, vehicleConfirmed: false });

    try {
      const res = await fetch("/api/dvla-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationNumber: clean }),
      });
      const data = await res.json();
      if (!res.ok) {
        update({ dvlaLoading: false, dvlaError: data.error || "Vehicle lookup failed" });
        return;
      }
      update({ dvlaLoading: false, dvlaData: data.vehicle, dvlaError: null });
    } catch {
      update({
        dvlaLoading: false,
        dvlaError: "The DVLA service is temporarily unavailable. Please try again in a moment.",
      });
    }
  }

  function retry() {
    update({
      dvlaData: null,
      dvlaError: null,
      vehicleConfirmed: false,
      vehicleReg: "",
    });
  }

  function confirmAndContinue() {
    update({ vehicleConfirmed: true });
    setStep(4);
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-slate-900">
        What is the vehicle registration?
      </h2>
      <p className="text-sm text-slate-500">
        We&apos;ll pull the DVLA record so you can confirm the vehicle.
      </p>

      {!state.dvlaData && (
        <>
          {/* UK number plate input */}
          <div className="space-y-3 max-w-md">
            <div
              className="flex items-center justify-center rounded-xl border-[3px] border-slate-900 bg-[#FFCC00] px-6 py-5 shadow-md shadow-slate-300/50 focus-within:ring-4 focus-within:ring-coral/30"
              aria-label="UK number plate"
            >
              <input
                type="text"
                value={reg}
                onChange={(e) => {
                  setLocalError(null);
                  update({ vehicleReg: cleanReg(e.target.value) });
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") lookup();
                }}
                maxLength={7}
                placeholder="ENTER REG"
                className="w-full bg-transparent text-center text-4xl sm:text-5xl font-black tracking-[0.15em] text-black uppercase outline-none placeholder:text-black/30 placeholder:font-bold leading-none"
                style={{ fontFamily: "'Charles Wright', 'Arial Black', sans-serif" }}
              />
            </div>
            <Button
              type="button"
              onClick={lookup}
              disabled={state.dvlaLoading || !reg}
              className="w-full h-12 bg-coral hover:bg-coral-dark text-white font-semibold rounded-lg text-base shadow-sm"
            >
              {state.dvlaLoading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Looking up&hellip;
                </>
              ) : (
                <>
                  <Search className="h-5 w-5 mr-2" />
                  Look up vehicle
                </>
              )}
            </Button>
          </div>

          {(localError || state.dvlaError) && (
            <p className="text-sm text-red-600">{localError || state.dvlaError}</p>
          )}
        </>
      )}

      {/* Confirmation card */}
      {state.dvlaData && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-coral/10 text-coral">
                <Car className="size-5" />
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-900">
                  {state.dvlaData.make ?? "Unknown make"}
                </p>
                <p className="text-xs text-slate-500">
                  Reg: {state.dvlaData.registrationNumber}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <Row label="Colour" value={state.dvlaData.colour} />
              <Row label="Fuel" value={state.dvlaData.fuelType} />
              <Row label="Year" value={state.dvlaData.yearOfManufacture} />
              <Row
                label="Engine"
                value={
                  state.dvlaData.engineCapacity
                    ? `${state.dvlaData.engineCapacity}cc`
                    : null
                }
              />
            </div>
          </div>

          <h3 className="text-base font-semibold text-slate-900">
            Is this the vehicle you&apos;re looking to buy?
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button
              onClick={confirmAndContinue}
              className="bg-coral hover:bg-coral-dark text-white font-semibold"
            >
              Yes, this is the vehicle
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button
              variant="outline"
              onClick={retry}
              className="border-slate-300"
            >
              No, let me try again
            </Button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center pt-2">
        <button
          type="button"
          onClick={() => setStep(2)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="font-medium text-slate-900">{value ?? "\u2014"}</p>
    </div>
  );
}
