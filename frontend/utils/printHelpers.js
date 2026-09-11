// utils/printHelpers.js - Helper functions for print (extracted from printUtils.js)

// Fungsi terbilang untuk konversi angka ke kata
export const terbilang = (angka) => {
  if (angka === 0) return 'nol';
  
  const bilangan = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
  
  const convert = (number) => {
    if (number < 12) {
      return bilangan[number];
    } else if (number < 20) {
      return convert(number - 10) + ' belas';
    } else if (number < 100) {
      return convert(Math.floor(number / 10)) + ' puluh ' + convert(number % 10);
    } else if (number < 200) {
      return 'seratus ' + convert(number - 100);
    } else if (number < 1000) {
      return convert(Math.floor(number / 100)) + ' ratus ' + convert(number % 100);
    } else if (number < 2000) {
      return 'seribu ' + convert(number - 1000);
    } else if (number < 1000000) {
      return convert(Math.floor(number / 1000)) + ' ribu ' + convert(number % 1000);
    } else if (number < 1000000000) {
      return convert(Math.floor(number / 1000000)) + ' juta ' + convert(number % 1000000);
    }
    return 'angka terlalu besar';
  };
  
  return convert(angka).replace(/\s+/g, ' ').trim();
};

// Fungsi untuk menghitung total dari biaya_list
export const calculateTotalFromBiayaList = (biayaList) => {
  let total = 0;
  
  if (biayaList && biayaList.length > 0) {
    biayaList.forEach(biaya => {
      // Hitung transportasi
      if (biaya.transportasi && biaya.transportasi.length > 0) {
        biaya.transportasi.forEach(t => {
          total += Number(t.total) || 0;
        });
      }
      
      // Hitung uang harian
      if (biaya.uang_harian && biaya.uang_harian.length > 0) {
        biaya.uang_harian.forEach(u => {
          total += Number(u.total) || 0;
        });
      }
      
      // Hitung penginapan
      if (biaya.penginapan && biaya.penginapan.length > 0) {
        biaya.penginapan.forEach(p => {
          total += Number(p.total) || 0;
        });
      }
    });
  }
  
  return total;
};
