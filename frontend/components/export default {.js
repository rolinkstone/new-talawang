export default {
  handlePrint,                    // Langsung print dengan detail
  handlePrintWithPreview,         // Preview dulu dengan detail
  handlePrintWithDetail,          // Untuk kompatibilitas
  generateOnePagePrintContentWithDetail, // Generate dengan detail
  generateOnePagePrintContent,    // Generate ringkas
  generatePreviewContent,         // Generate preview
  terbilang,
  formatRupiah,
  formatDateForDisplay,
  formatDateRange,
  calculateTotalFromBiayaList,    // Fungsi helper baru
  validateAndUpdateItemData,      // Untuk update data item
  validateAndUpdatePegawaiList,   // Untuk update data pegawai
  shouldShowQRCode,               // Untuk testing QRCode logic
  generateQRCodeData              // Untuk testing QRCode data
};