// components/SalesChart.js
import React from 'react';
import { Bar } from 'react-chartjs-2';

const SalesChart = ({ data }) => {
  const chartData = {
    labels: data.map((item) => item.sale_date.split('-')[1] + '-' + item.sale_date.split('-')[0].slice(2)),
    datasets: [{
      label: 'Penjualan',
      data: data.map((item) => parseFloat(item.total_amount)),
      backgroundColor: 'rgba(255, 99, 132, 0.2)',
      borderColor: 'rgba(255, 99, 132, 1)',
      borderWidth: 1
    }]
  };

  const options = {
    title: {
      display: true,
      text: 'Penjualan per Bulan'
    },
    scales: {
      yAxes: [{
        ticks: {
          beginAtZero: true
        }
      }]
    }
  };

  return (
    <div>
      <Bar data={chartData} options={options} />
    </div>
  );
};

export default SalesChart;