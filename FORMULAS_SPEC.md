# Maestro Operaciones USDT — Formula & Logic Specification

This document is the **source of truth** for the web application. Every calculation in
`src/lib/engine/*` is a direct port of a formula found in the original workbook
`Maestro operaciones USDT.xlsx`. Cell references use the original sheet/column layout.

The workbook is a Google Sheets export (hence `QUERY`, `FILTER`, `__xludf.DUMMYFUNCTION`
artifacts). Those functions are *views* over the source sheets and are reproduced as
server-side derived queries, never as stored data.

---

## 1. Worksheets and their role

| Sheet | Rows | Role |
|-------|------|------|
| `PARAMETROS` | 4882 | Master lists: operaciones/clientes, pagadores+comisión, comisión por operación, empresas, estados de pago, cajas, conceptos, detalles. Also QUERY helper columns. |
| `Operacion_propia` | 2590 | **Propia** flow: company buys USD from a client and pays a provider (pagador) in USDT. Drives purchases (inventory IN) and CxC. |
| `Operación` | 2930 | **Venta** flow: client delivers USDT, company pays USD. Produces realized profit (inventory OUT). |
| `Caja` | 47080 | Cash ledger across multiple boxes (BELGICA, JUNIOR, CAJA, CAJA MENOR). Income/expense/concept. |
| `Saldos prov` | 5040 | Per-payer (OTC/PARE) running balances and per-client balances. |
| `Abonos calculadora & Cierres` | 1999 | **The engine.** Daily time series of cash, receivables, payables, inventory valuation (weighted-average), capital and margin. Plus monthly `Cierre` (P&L) block. |
| `Prestamo` | 50991 | Loans: CxP (payable) and CxC (receivable), with an `abonos` (payments) sub-ledger. |
| `Inversiones USDT` | 3 | Capital injections in USDT. |
| `Ut pendiente` | 1000 | Pending margin / open USDT position per operación. |
| `Tallar` | 4059 | Scratch/report QUERY views over the two operation sheets. Not persisted; reproduced as queries. |

### Named ranges that matter
- `cliente10 = PARAMETROS!A12 = "OPO"` — the OTC self/external operation client. Special-cased in profit.
- `cliente13 = PARAMETROS!A15 = "AVON"` — second special client.
- `TRM = 'Abonos calculadora & Cierres'!B2 = 3410` — current USDT/COP reference rate.
- `margen_bruto = 'Abonos calculadora & Cierres'!B3`.

---

## 2. Master data (PARAMETROS)

**Operaciones / Clientes (col A == col K):** CDA, SONY, HBO, PLANTA, ADDI, VELA, PERA,
LUNA, CHIMBI, OPO, META, TESLA, AVON, PEZZUTY, JBL, PEPE, SENSEI, MANGO, COCACOLO, FIDO.

**Comisión por operación/cliente (col L), e.g.:** CDA 0.008, PLANTA 0.018, CHIMBI 0.016,
OPO 0.005, AVON 0.00475, JBL 0.011, COCACOLO 0.035, TESLA/PEPE/SENSEI/MANGO 0.0.

**Pagadores + comisión (cols G/H):** OTC 0.0025, PARE 0.004, Propia 0, N/A 0,
OTC_nocom 0.005. (Rows 10-12 G = Préstamos / CxC / CxP are control tags, not real payers.)

> Note: the *client* commission (`L`) and the *payer* commission (`H`) are different
> rates. Profit is the spread between them.

**Estados de pago:** Pendiente dirección, Pendiente producto, Cancelado,
Pendiente de rebote, Prueba de existencia.

**Cajas:** BELGICA, JUNIOR, CAJA, CAJA MENOR.

**Conceptos (Caja):** COMPRAS, GASTOS, OTROS, RECAUDOS, DEVOLUCION CAPITAL, INVERSIONES,
INGRESO PRESTAMO, LIQUIDACION, CAPITALIZACION.

**Detalles (expense categories):** INTERESES, PAGO CAPITAL, TRANSPORTE, ALIMENTACION,
SALARIOS, TECNOLOGIA, RENTAS, PRESTAMO, IMPUESTOS, OTROS, OCIO, PROPINAS, ASESORIA,
ASEO, VIAJES, SERVICIOS, COMISIONES.

---

## 3. Operacion_propia (Propia purchases)

Per row (`r`), letters are the original columns:

| Col | Field | Formula |
|-----|-------|---------|
| I | Comisión Pagador | `IF(A="", "", IF(Código=999, 0, VLOOKUP(Pagador, PARAMETROS!G:H, 2, 0)))` |
| J | USDT a Enviar a el Pagador | `PagoUSD * (1 + ComisiónPagador)` |
| N | Compras | manual (USDT bought; sign convention as entered) |
| U | Total due COP | `PagoUSD * PV / 1000` |
| V | Total compras COP | `PrecioCompra * Compras / 1000` |
| W | Saldo corriente | `Compras - USDTaPagador` |
| X | Compras netas | `IF(PrecioCompra = 0, 0, Compras)` |
| AC | Comisión (fija USD) | `IF(OR(PagoUSD="", PagoUSD=0), "", IF(AND(Pagador="OTC", PagoUSD<=10000), 25, 0))` |

**Validated:** SONY row — `J=27000*1.004=27108`, `U=27000*3660/1000=98820`,
`V=3620*29996/1000=108585.52`, `W=29996-27108=2888`, `AC=0` (>10000). ✔

---

## 4. Operación (Venta / sale)

| Col | Field | Formula |
|-----|-------|---------|
| F | USDT equivalente | `IF(Cliente="", "", PagoUSD * (1 + Comisión))` |
| M | Comisión Pagador | `IF(OR(Cliente=cliente10, Cliente=cliente13), special%, IF(Pagador="", "", VLOOKUP(Pagador, PARAMETROS!G2:H8, 2, 0)))` |
| N | USDT a Enviar a el Pagador | `IF(Estado="Cancelado", "", PagoUSD * (1 + ComisiónPagador))` |
| P | **Utilidad en USDT** | `IF(Cliente=cliente10, UtilidadUSD, IF(Cliente<>"", (IngresosUSDT / (1 + Comisión)) * (Comisión - ComisiónPagador), ""))` |
| Q | Utilidad en USD | as recorded / paired |
| X | comision_usd_pagador | `IF(PagoUSD=0, 0, IF(Pagador<>"OTC", 0, IF(PagoUSD<=10000, 25, 0)))` |

**Validated:** AVON row — `F=14000*1.006=14084`, `N=14000*1.004=14056`,
`P=(85000/1.006)*(0.006-0.004)=168.986`. ✔

> Profit is therefore **the commission spread applied to the USDT volume**, not
> sale-minus-purchase. This is the per-operation realized margin.

---

## 5. Caja (cash ledger)

| Col | Field | Formula |
|-----|-------|---------|
| C | Entradas | income (manual or `=MONTO` link) |
| D | Salidas | expense |
| M | Total COP | `MONTO * COSTO` |
| N | Balance | running balance per box |
| H | GANANCIA OCASIONAL | flag SI/NO (occasional gain) |

Cash balance per box = `Σ Entradas − Σ Salidas` filtered by `Caja` and date.

---

## 6. Saldos prov (payer / client balances)

Per-client balance (`I`/`J` "Balance OTC" / "Balance PARE") is, for a given payer `P`:

```
balance = initialBalance
        + SUMIFS(Operacion_propia.J  where date>=startDate and Pagador=P)   // USDT sent (propia)
        + SUMIFS(Operación.N         where date>=startDate and Pagador=P)   // USDT sent (venta)
        - SUMIFS(SaldosProv.C        where Cliente=client and Pagador=P)    // USDT received/settled
```

(The workbook splits OTC vs PARE into two columns using `PARAMETROS!G2` / `G3`.)

---

## 7. Prestamo (loans)

Columns: Nombre, Codigo, Tipo (`CxP`|`CxC`), Monto, Tasa, Fecha pago, Detalle, Notas,
Abono, Saldo. Sub-ledger `abonos` (cols L-O): Fecha, Codigo, Abono, Notas.

- `Saldo (J)` = `Monto − Σ Abonos(Codigo)`.
- Loan effect on capital:
  - **CxP** (payable) reduces capital: pulled into Abonos col `T` via `SUMIFS(Prestamo.J where Tipo=CxP)`.
  - **CxC** (receivable from people) adds to capital: Abonos col `AC` via `SUMIFS(Prestamo.J where Tipo=CxC)`.
- Liquidations (`Notas="Liquidación"`) and capital repayments feed the Cierre block.

---

## 8. Inversiones USDT

`Inversión COP (D) = InversionEnUSDT * TasaUSDT / 1000`. Capital injections; subtracted
out of "increase in capital" so they don't read as profit.

---

## 9. Abonos calculadora & Cierres — THE DAILY ENGINE

The daily series lives in columns `O…AJ`, one row per calendar day (`O` = date). Each
column is a running/daily aggregate over the source sheets. `r` = current day row,
`r-1` = previous day.

| Col | Field | Formula (ported) |
|-----|-------|------------------|
| O | Fecha | day |
| P | Efectivo | `P[r-1] + SUMIFS(Caja.Entradas, date=O) − SUMIFS(Caja.Salidas, date=O)` |
| Q | CxC con recibo | `Q[r-1] + (Σ PARAMETROS.S where R=date) − Σ(Operacion_propia.AbonosCOP where FechaAbono=date)` |
| R | CxC sin recibo | `Σ PARAMETROS.U where T=date` (receivables w/o receipt) |
| S | CxC USDT | `S[r-1] + Σ PARAMETROS.W where V=date` |
| T | CxP COP | `SUMIFS(Prestamo.Saldo where Tipo=CxP)` |
| U | Compras netas (USDT) | `Σ Operacion_propia.ComprasNetas where Fecha=date` |
| V | USDT/COP (día) | `IFERROR(Σ Operacion_propia.TotalComprasCOP / U, 0) * 1000` |
| W | Saldo real wallet (día) | `Σ Operacion_propia.Compras − Σ Operacion_propia.USDTaPagador (Fecha=date)` |
| X | **Saldo real wallet Acumulado** | `X[r-1] + W` (cumulative USDT inventory) |
| Z | **USDT/COP promedio día (cost rate)** | carry-forward weighted average: `IF(V=0, last nonzero V among up to 4 prior days, V)` |
| Y | Valor COP (inventory value) | `Z * X / 1000` |
| AA | Saldo wallet ganancia (USDT) | `AA[r-1] + Σ Operacion_propia.SaldoWalletGanancias (Fecha=date)` |
| AB | Saldo ganancias COP | `Z * AA / 1000` |
| AC | CxC Personas | `SUMIFS(Prestamo.Saldo where Tipo=CxC)` |
| AD | **Total capital** | `Efectivo + CxC_recibo + CxC_sinRecibo + (CxC_USDT * Z) − CxP + ValorCOP + GananciasCOP + CxC_Personas` = `P+Q+R+(S*Z)−T+Y+AB+AC` |
| AE | Incremento K | `AD − AD[r-1]` |
| AF | Promedio Venta (rate) | `Σ Operacion_propia.TotalDueCOP / Σ Operacion_propia.PagoUSD * 1000` (excl. códigos `0T`,`999`) |
| AG | **Margen bruto** | `IF(AF=0, 0, AF − (Z * (1 + comisión_base)))` where comisión_base = `PARAMETROS!L2` |
| AH | Incremento K bruto | `AE + Σ Prestamo payments(liquidación) − Σ Caja(GananciaOcasional=SI)` |
| AI | Saldo (USDT abierto) | `Σ Operación.Ingresos(≤date, cliente≠OPO) − Σ Operación.USDTequiv(≤date, cliente≠OPO)` |
| AJ | Variación Capital | `AD / AD[r-1] − 1` |

### Inventory methodology (confirmed, not assumed)
- **Method: daily Weighted-Average Cost with carry-forward.**
- Inventory quantity = cumulative wallet USDT (`X`).
- Daily acquisition cost rate = `V` = `Σ COP spent on purchases / Σ USDT purchased * 1000`.
- The valuation rate `Z` equals `V` on days with purchases; on days without purchases it
  **carries forward** the most recent nonzero rate (looking back up to 4 days in the
  formula, generalized to "last known rate" in the engine).
- Inventory value `Y = Z * X / 1000`. Profit margin `AG` compares the average **sale**
  rate `AF` against the average **cost** rate `Z` grossed up by base commission.
- This is *not* FIFO or LIFO. The port implements WAC carry-forward exactly.

### Cierre (monthly P&L) block — cols B..M, named range `PYG`
Per close (month): TOTAL K, Variacion, Inversiones, Capitalizacion,
Liquidaciones (utilidad y CxC), Ganancia neta global, Ganancia ocasional,
Ganancia neta, Gastos, Ganancia bruta. These are period deltas of the daily series
minus capital injections (Inversiones) and capitalizations, plus occasional gains, less
expenses (Caja concept=GASTOS).

---

## 10. Ut pendiente

| Col | Field | Formula |
|-----|-------|---------|
| B | Margen | `IF(VLOOKUP(Op, PARAMETROS!K:L)=0, 0, comisión − 0.8%)` |
| C | Saldo | `Σ Operación.IngresosUSDT(cliente=Op) − Σ Operación.USDTequiv(cliente=Op)` |

`0.8%` = base operating commission constant (`PARAMETROS!L2 = 0.008`).

---

## 11. Rounding & money rules
- COP figures are divided by 1000 in many places ("miles de COP" working unit).
- USDT carried to full precision; no premature rounding (matches Excel).
- Commission rates stored as decimals (0.006 = 0.6%).
- The engine never rounds intermediates; rounding is presentation-only.

---

## 12. Dependency graph (recompute order)

```
PARAMETROS (master)            Inversiones USDT
   │                                  │
   ▼                                  ▼
Operacion_propia ─┐   Operación ─┐    │   Prestamo ─┐   Caja ─┐
                  ▼              ▼    ▼              ▼        ▼
                  └──────────► Abonos calculadora & Cierres (daily engine)
                                       │
                                       ▼
                          Saldos prov / Ut pendiente / Dashboard / Cierre P&L
```

Source rows are immutable history. Derived series (daily engine, balances, P&L) are
recomputed server-side and cached as materialized summaries.
