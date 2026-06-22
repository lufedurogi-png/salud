export function discountApplies(storeDiscount) {
    return Boolean(storeDiscount?.has_discount)
}

export function computeStorePricing(subtotal, storeDiscount) {
    const base = Math.max(0, Number(subtotal) || 0)
    if (!discountApplies(storeDiscount)) {
        return {
            subtotal: base,
            discountPercent: 0,
            discountAmount: 0,
            total: base,
            isFree: false,
            hasDiscount: false,
            label: null,
        }
    }

    const percent = Math.max(0, Math.min(100, Number(storeDiscount.discount_percent) || 0))
    const discountAmount = Math.round(base * (percent / 100) * 100) / 100
    const total = Math.max(0, Math.round((base - discountAmount) * 100) / 100)
    const isFree = percent >= 100 || total <= 0

    return {
        subtotal: base,
        discountPercent: percent,
        discountAmount,
        total,
        isFree,
        hasDiscount: percent > 0,
        label: isFree
            ? 'Compra gratis (beneficio del entrenador)'
            : `${percent}% de descuento`,
    }
}
