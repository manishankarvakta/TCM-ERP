export function sanitizeClientProfile(client: any) {
  if (!client) return null;
  return {
    id: client.id,
    name: client.name || null,
    phone: client.phone || null,
    email: client.email || null,
    address: client.address || null,
    city: client.city || null,
    state: client.state || null,
    zip: client.zip || null,
    country: client.country || null,
    clientType: client.clientType || "regular",
    membershipNumber: client.membershipNumber || null,
    membershipTier: client.membershipTier || "NONE",
    membershipStatus: client.membershipStatus || "INACTIVE",
    membershipPoints: client.membershipPoints || 0,
    lastLoginAt: client.lastLoginAt || null,
  };
}

export function sanitizeClientAddress(address: any) {
  if (!address) return null;
  return {
    id: address.id,
    recipientName: address.recipientName,
    phone: address.phone,
    addressLine: address.addressLine,
    area: address.area || null,
    city: address.city || null,
    district: address.district || null,
    division: address.division || null,
    country: address.country,
    isDefault: address.isDefault,
    createdAt: address.createdAt,
    updatedAt: address.updatedAt,
  };
}

export function serializeCategory(category: any) {
  if (!category) return null;
  return {
    id: category.id,
    name: category.name,
    slug: category.slug || null,
    description: category.description || null,
    productCount: category._count?.items ?? undefined,
  };
}

export function serializeUnit(unit: any) {
  if (!unit) return null;
  return {
    id: unit.id,
    symbol: unit.symbol,
    details: unit.details,
  };
}

export function serializeProductCard(item: any) {
  if (!item) return null;

  // Calculate total stock from stocks array
  const totalStock = item.stocks ? item.stocks.reduce((sum: number, stock: any) => {
    return sum + (Number(stock.quantity) - Number(stock.reservedQuantity));
  }, 0) : 0;

  // If there are variants, sum up variant stocks instead
  let availableStock = totalStock;
  if (item.variants && item.variants.length > 0) {
    availableStock = item.variants.reduce((sum: number, variant: any) => {
      const varStock = variant.stocks ? variant.stocks.reduce((vSum: number, stock: any) => {
        return vSum + (Number(stock.quantity) - Number(stock.reservedQuantity));
      }, 0) : 0;
      return sum + varStock;
    }, 0);
  }

  // Parse images if JSON
  let imageList: string[] = [];
  if (item.images) {
    try {
      imageList = typeof item.images === "string" ? JSON.parse(item.images) : item.images;
    } catch (_) {}
  }

  return {
    id: item.id,
    code: item.code,
    name: item.name,
    slug: item.slug || null,
    description: item.description || null,
    category: item.category ? {
      id: item.category.id,
      name: item.category.name,
      slug: item.category.slug || null
    } : null,
    unit: item.unit ? {
      id: item.unit.id,
      symbol: item.unit.symbol,
      details: item.unit.details
    } : null,
    salesPrice: item.salesPrice ? Number(item.salesPrice) : null,
    featuredImage: item.featuredImage || null,
    images: Array.isArray(imageList) ? imageList : [],
    colors: item.colors || [],
    sizes: item.sizes || [],
    isVatEnabled: !!item.isVatEnabled,
    vatPercentage: item.vatPercentage ? Number(item.vatPercentage) : 0,
    availableStock: Math.max(0, availableStock),
    outOfStock: availableStock <= 0,
  };
}

export function serializeVariant(variant: any, parentPrice: number) {
  if (!variant) return null;
  const varStock = variant.stocks ? variant.stocks.reduce((sum: number, stock: any) => {
    return sum + (Number(stock.quantity) - Number(stock.reservedQuantity));
  }, 0) : 0;

  const price = variant.salesPrice !== null && variant.salesPrice !== undefined
    ? Number(variant.salesPrice)
    : parentPrice;

  return {
    id: variant.id,
    sku: variant.sku,
    barcode: variant.barcode || null,
    size: variant.size,
    color: variant.color,
    salesPrice: price,
    image: variant.image || null,
    availableStock: Math.max(0, varStock),
    outOfStock: varStock <= 0,
  };
}

export function serializeProductDetail(item: any) {
  if (!item) return null;

  const basePrice = item.salesPrice ? Number(item.salesPrice) : 0;

  // Format variants first
  const variants = item.variants
    ? item.variants.map((v: any) => serializeVariant(v, basePrice))
    : [];

  // Calculate stock
  let availableStock = 0;
  if (variants.length > 0) {
    availableStock = variants.reduce((sum: number, v: any) => sum + v.availableStock, 0);
  } else {
    availableStock = item.stocks ? item.stocks.reduce((sum: number, stock: any) => {
      return sum + (Number(stock.quantity) - Number(stock.reservedQuantity));
    }, 0) : 0;
  }

  // Parse images if JSON
  let imageList: string[] = [];
  if (item.images) {
    try {
      imageList = typeof item.images === "string" ? JSON.parse(item.images) : item.images;
    } catch (_) {}
  }

  return {
    id: item.id,
    code: item.code,
    name: item.name,
    slug: item.slug || null,
    description: item.description || null,
    category: item.category ? {
      id: item.category.id,
      name: item.category.name,
      slug: item.category.slug || null
    } : null,
    unit: item.unit ? {
      id: item.unit.id,
      symbol: item.unit.symbol,
      details: item.unit.details
    } : null,
    salesPrice: basePrice,
    featuredImage: item.featuredImage || null,
    images: Array.isArray(imageList) ? imageList : [],
    colors: item.colors || [],
    sizes: item.sizes || [],
    isVatEnabled: !!item.isVatEnabled,
    vatPercentage: item.vatPercentage ? Number(item.vatPercentage) : 0,
    trackInventory: !!item.trackInventory,
    availableStock: Math.max(0, availableStock),
    outOfStock: availableStock <= 0,
    variants,
  };
}

export function serializePagination(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export function serializeEcomOrderSummary(sale: any) {
  if (!sale) return null;
  
  const paymentDetails = sale.paymentDetails && typeof sale.paymentDetails === "object"
    ? sale.paymentDetails
    : {};

  return {
    id: sale.id,
    saleNumber: sale.saleNumber,
    status: sale.status,
    orderType: sale.orderType,
    deliveryStatus: sale.deliveryStatus || "PENDING",
    paymentStatus: paymentDetails.paymentStatus || "UNPAID",
    paymentMethod: paymentDetails.paymentMethod || "COD",
    subTotal: Number(sale.subTotal),
    discount: sale.discount ? Number(sale.discount) : 0,
    tax: sale.tax ? Number(sale.tax) : 0,
    deliveryCharge: sale.deliveryCharge ? Number(sale.deliveryCharge) : 0,
    grandTotal: Number(sale.grandTotal),
    createdAt: sale.createdAt,
  };
}

export function serializeEcomOrderListItem(sale: any) {
  if (!sale) return null;
  
  const paymentDetails = sale.paymentDetails && typeof sale.paymentDetails === "object"
    ? sale.paymentDetails
    : {};

  return {
    id: sale.id,
    saleNumber: sale.saleNumber,
    status: sale.status,
    orderType: sale.orderType,
    deliveryStatus: sale.deliveryStatus || "PENDING",
    paymentMethod: paymentDetails.paymentMethod || null,
    paymentStatus: paymentDetails.paymentStatus || null,
    subTotal: Number(sale.subTotal),
    discount: sale.discount ? Number(sale.discount) : 0,
    tax: sale.tax ? Number(sale.tax) : 0,
    deliveryCharge: sale.deliveryCharge ? Number(sale.deliveryCharge) : 0,
    grandTotal: Number(sale.grandTotal),
    itemCount: sale.items ? sale.items.length : (sale._count?.items ?? 0),
    createdAt: sale.createdAt,
  };
}

export function serializeEcomOrderItem(saleItem: any) {
  if (!saleItem) return null;

  // Resolve images safely
  let imageList: string[] = [];
  if (saleItem.item?.images) {
    try {
      imageList = typeof saleItem.item.images === "string"
        ? JSON.parse(saleItem.item.images)
        : saleItem.item.images;
    } catch (_) {}
  }
  const imageUrl = saleItem.variant?.image || saleItem.item?.featuredImage || (imageList[0] || null);

  return {
    id: saleItem.id,
    itemId: saleItem.itemId,
    variantId: saleItem.variantId || null,
    name: saleItem.item?.name || "Unknown Product",
    code: saleItem.item?.code || "N/A",
    image: imageUrl,
    variant: saleItem.variant ? {
      id: saleItem.variant.id,
      sku: saleItem.variant.sku,
      size: saleItem.variant.size || null,
      color: saleItem.variant.color || null,
    } : null,
    quantity: Number(saleItem.quantity),
    unitPrice: Number(saleItem.unitPrice),
    amount: Number(saleItem.amount),
  };
}

export function serializeEcomOrderDetail(sale: any) {
  if (!sale) return null;

  const paymentDetails = sale.paymentDetails && typeof sale.paymentDetails === "object"
    ? sale.paymentDetails
    : {};

  const deliveryAddress = sale.deliveryAddress && typeof sale.deliveryAddress === "object"
    ? sale.deliveryAddress
    : {};

  return {
    id: sale.id,
    saleNumber: sale.saleNumber,
    status: sale.status,
    orderType: sale.orderType,
    deliveryStatus: sale.deliveryStatus || "PENDING",
    paymentMethod: paymentDetails.paymentMethod || null,
    paymentStatus: paymentDetails.paymentStatus || null,
    paymentReference: paymentDetails.paymentReference || null,
    subTotal: Number(sale.subTotal),
    discount: sale.discount ? Number(sale.discount) : 0,
    tax: sale.tax ? Number(sale.tax) : 0,
    deliveryCharge: sale.deliveryCharge ? Number(sale.deliveryCharge) : 0,
    grandTotal: Number(sale.grandTotal),
    deliveryAddress: {
      recipientName: deliveryAddress.recipientName || null,
      phone: deliveryAddress.phone || null,
      addressLine: deliveryAddress.addressLine || null,
      city: deliveryAddress.city || null,
      district: deliveryAddress.district || null,
    },
    coupon: sale.coupon ? {
      id: sale.coupon.id,
      code: sale.coupon.code,
    } : null,
    items: sale.items ? sale.items.map(serializeEcomOrderItem) : [],
    notes: sale.notes || null,
    createdAt: sale.createdAt,
    updatedAt: sale.updatedAt,
  };
}
