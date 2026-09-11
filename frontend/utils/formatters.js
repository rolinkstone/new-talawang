// utils/formatters.js

export const formatRupiah = (value) => {
    return Number(value || 0).toLocaleString("id-ID");
};

// utils/formatters.js
export const formatDateForDisplay = (dateString) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (error) {
    return dateString;
  }
};

// formatters.js
export const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    
    if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return dateString;
    }
    
    let date;
    if (dateString instanceof Date) {
        date = dateString;
    } else if (typeof dateString === 'string') {
        date = new Date(dateString);
        
        if (isNaN(date.getTime())) {
            const parts = dateString.split('/');
            if (parts.length === 3) {
                date = new Date(parts[2], parts[1] - 1, parts[0]);
            } else {
                const isoDate = dateString.replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$3-$2-$1');
                date = new Date(isoDate);
            }
        }
    } else {
        return '';
    }
    
    if (isNaN(date.getTime())) {
        return '';
    }
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
};

// Format Date range untuk pelaksanaan (Indonesian locale)
export const formatDateRange = (startDate, endDate) => {
  if (!startDate && !endDate) return '-';
  
  try {
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    
    if (start && end) {
      const startDay = start.getDate();
      const startMonth = start.toLocaleDateString('id-ID', { month: 'long' });
      const startYear = start.getFullYear();
      const endDay = end.getDate();
      const endMonth = end.toLocaleDateString('id-ID', { month: 'long' });
      const endYear = end.getFullYear();
      
      if (startMonth === endMonth && startYear === endYear) {
        return `${startDay} s.d. ${endDay} ${startMonth} ${startYear}`;
      }
      return `${startDay} ${startMonth} ${startYear} s.d. ${endDay} ${endMonth} ${endYear}`;
    } else if (start) {
      const day = start.getDate();
      const month = start.toLocaleDateString('id-ID', { month: 'long' });
      const year = start.getFullYear();
      return `${day} ${month} ${year}`;
    }
    return formatDateForDisplay(startDate) || '-';
  } catch (error) {
    return `${formatDateForDisplay(startDate)} s.d. ${formatDateForDisplay(endDate)}`;
  }
};

// Format MAK: ekstrak kode penting, susun ulang jadi singkatan
// Ekstrak bagian-bagian MAK (digunakan oleh formatMak dan filter pagu)
export const getMakParts = (mak) => {
    const parts = mak.split('.');
    if (parts.length < 15) return { kodeHuruf: '', kodeJenis: '' };
    const match5 = parts[4].match(/^(\d+)([A-Za-z]+)/);
    return {
        kodeHuruf: match5 ? match5[2] : '',
        kodeJenis: parts[2] || ''
    };
};

export const formatMak = (mak) => {
    if (!mak) return '-';
    
    // Coba format dengan kurung dulu: (524119), (6384), (EBA), dll
    const parenMatches = mak.match(/\(([^)]+)\)/g);
    if (parenMatches && parenMatches.length >= 3) {
        const values = parenMatches.map(m => m.replace(/[()]/g, ''));
        // values[0]=524119, values[1]=6384, values[2]=EBA, values[3]=994, values[4]=002, values[5]=J
        if (values.length >= 6) {
            return `${values[1]}.${values[2]}.${values[3]}.${values[4]}.${values[0]}.${values[5]}`;
        }
        return values.join('.');
    }
    
    // Format tanpa kurung: 432872.043.524111.06301DR.3165AEA.A000000001...
    const parts = mak.split('.');
    if (parts.length >= 15) {
        // parts[4] = "3165AEA" → pisah angka + huruf
        const segment5Match = parts[4].match(/^(\d+)([A-Za-z]+)/);
        const kode1 = segment5Match ? segment5Match[1] : parts[4];        // 3165
        const kode2 = segment5Match ? segment5Match[2] : '';              // AEA
        
        // parts[14] = "0A" → ambil hurufnya saja
        const segment15Match = parts[14].match(/[A-Za-z]+/);
        const kode6 = segment15Match ? segment15Match[0] : parts[14];     // A
        
        return `${kode1}.${kode2}.${parts[12]}.${parts[13]}.${parts[2]}.${kode6}`;
    }
    
    return mak;
};

