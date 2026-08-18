(()=>{
// Legacy compatibility shim.
// Order fulfillment is now managed from Customers / Orders through customer-orders-operations.js.
// Keep this file inert so old cached CMS HTML cannot re-register the deprecated capture-phase fulfillment handler.
window.FDE_LEGACY_FULFILLMENT_DISABLED=true;
})();
