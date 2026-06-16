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

