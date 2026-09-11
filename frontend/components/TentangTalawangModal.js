import Image from 'next/image';

export default function TentangTalawangModal({ show, onClose, onLogin }) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
      <div className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden transform animate-slideUp">
        {/* Modal Header dengan Logo */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-700 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-14 h-14 bg-white/20 rounded-xl p-2 backdrop-blur-sm flex items-center justify-center">
                <div className="relative w-10 h-10">
                  <Image
                    src="/images/talawang-dayak-borneo-png.webp"
                    alt="Talawang Logo"
                    fill
                    className="object-contain"
                  />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Talawang</h2>
                <p className="text-blue-100 text-sm">Sistem Pengelolaan Perjalanan Dinas</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          <div className="p-6">
            {/* Pengantar */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                Sekilas Tentang Talawang
              </h3>
              <p className="text-gray-600 mb-4">
                <strong>Talawang</strong> merupakan sistem pengelolaan perjalanan dinas yang dirancang untuk memastikan setiap perjalanan dinas di BBPOM Palangka Raya dilaksanakan sesuai dengan prinsip-prinsip pengelolaan keuangan negara yang baik.
              </p>
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                <p className="text-blue-800 font-medium italic">
                  &ldquo;Perjalanan dinas dilaksanakan secara tertib, sah secara hukum, hemat anggaran, dapat dipertanggungjawabkan, dan memberikan manfaat nyata bagi organisasi.&rdquo;
                </p>
              </div>
            </div>

            {/* Makna Talawang */}
            <div className="mb-8">
              <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Makna & Filosofi Talawang
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
                  <h5 className="font-bold text-blue-700 mb-2">Talawang</h5>
                  <p className="text-sm text-gray-600">Dalam bahasa Dayak, Talawang berarti <strong>perisai</strong>. Sistem ini berfungsi sebagai perisai untuk melindungi integritas dan akuntabilitas pengelolaan perjalanan dinas.</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-100">
                  <h5 className="font-bold text-green-700 mb-2">Prinsip Dasar</h5>
                  <p className="text-sm text-gray-600">Mengacu pada asas-asas pengelolaan keuangan negara: Tertib, Legal, Efisien, Efektif, Akurat, Wajar, Akuntabel, Nyata, dan Bermanfaat.</p>
                </div>
              </div>
            </div>

            {/* 9 Prinsip Talawang */}
            <div className="mb-8">
              <h4 className="text-lg font-semibold text-gray-800 mb-6 flex items-center">
                <svg className="w-5 h-5 mr-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                9 Prinsip Talawang (TALAWANG)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <PrinsipCard letter="T" title="Tertib Administrasi" desc="Prosedur dan dokumen lengkap sesuai ketentuan." color="blue" tag="Disiplin Prosedur" />
                <PrinsipCard letter="E" title="Efektif" desc="Tercapainya tujuan dengan hasil maksimal." color="green" tag="Tujuan Tercapai" />
                <PrinsipCard letter="L" title="Legal" desc="Sesuai peraturan perundang-undangan." color="purple" tag="Sesuai Hukum" />
                <PrinsipCard letter="A" title="Akurat" desc="Data dan informasi tepat, benar, dan dapat dipertanggungjawabkan." color="yellow" tag="Data Tepat" />
                <PrinsipCard letter="W" title="Wajar" desc="Masuk akal dan sesuai kebutuhan riil." color="orange" tag="Masuk Akal" />
                <PrinsipCard letter="A" title="Akuntabel" desc="Dapat dipertanggungjawabkan secara transparan." color="red" tag="Transparan" />
                <PrinsipCard letter="N" title="Nyata" desc="Konkrit dan dapat dibuktikan kebenarannya." color="indigo" tag="Konkrit" />
                <PrinsipCard letter="G" title="Guna" desc="Memberikan manfaat nyata bagi organisasi." color="teal" tag="Bermanfaat" />
                <PrinsipCard letter="E*" title="Efisien" desc="Penggunaan sumber daya optimal dengan biaya minimal." color="emerald" tag="Optimal" />
              </div>
            </div>

            {/* Tujuan Sistem */}
            <div className="mb-8">
              <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                </svg>
                Tujuan Sistem Talawang
              </h4>
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5">
                <ul className="space-y-3">
                  {[
                    'Digitalisasi proses pengajuan dan pelaporan perjalanan dinas',
                    'Meningkatkan efisiensi dan transparansi pengelolaan anggaran',
                    'Memastikan kepatuhan terhadap regulasi keuangan negara',
                    'Menyediakan data real-time untuk pengambilan keputusan',
                    'Mengurangi beban administrasi dan waktu proses',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start">
                      <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Manfaat */}
            <div className="mb-8">
              <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
                Manfaat Menggunakan Talawang
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ManfaatCard icon={<svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>} color="blue" title="Keamanan Data" desc="Data terenkripsi dan terlindungi dengan sistem keamanan berlapis." />
                <ManfaatCard icon={<svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>} color="green" title="Proses Cepat" desc="Waktu proses pengajuan dan persetujuan lebih efisien." />
                <ManfaatCard icon={<svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>} color="purple" title="Laporan Real-time" desc="Monitoring dan pelaporan real-time untuk pengambilan keputusan." />
                <ManfaatCard icon={<svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>} color="yellow" title="Kepatuhan Regulasi" desc="Otomatisasi validasi sesuai peraturan yang berlaku." />
              </div>
            </div>

            {/* Footer Modal */}
            <div className="mt-8 pt-6 border-t border-gray-200 text-center">
              <p className="text-sm text-gray-500 mb-2">
                Sistem Talawang dikembangkan untuk mendukung good governance dalam pengelolaan perjalanan dinas.
              </p>
              <div className="flex items-center justify-center space-x-4 text-xs text-gray-400">
                <span>BBPOM di Palangka Raya</span>
                <span>&bull;</span>
                <span>Kementerian Kesehatan RI</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Button */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4">
          <div className="flex justify-between items-center">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              Tutup
            </button>
            <button
              onClick={onLogin}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-800 transition-all shadow-md hover:shadow-lg"
            >
              Login ke Talawang
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PrinsipCard({ letter, title, desc, color, tag }) {
  const colorMap = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    orange: 'bg-orange-100 text-orange-600',
    red: 'bg-red-100 text-red-600',
    indigo: 'bg-indigo-100 text-indigo-600',
    teal: 'bg-teal-100 text-teal-600',
    emerald: 'bg-emerald-100 text-emerald-600',
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start mb-3">
        <div className={`w-10 h-10 ${colorMap[color]?.split(' ')[0] || 'bg-gray-100'} rounded-lg flex items-center justify-center mr-3 flex-shrink-0`}>
          <span className={`${colorMap[color]?.split(' ')[1] || 'text-gray-600'} font-bold`}>{letter}</span>
        </div>
        <div>
          <h5 className="font-bold text-gray-800">{title}</h5>
          <p className="text-sm text-gray-600 mt-1">{desc}</p>
        </div>
      </div>
      <div className={`text-xs ${colorMap[color]?.split(' ')[1] || 'text-gray-600'} font-medium`}>
        <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        {tag}
      </div>
    </div>
  );
}

function ManfaatCard({ icon, color, title, desc }) {
  const bgMap = {
    blue: 'bg-blue-100',
    green: 'bg-green-100',
    purple: 'bg-purple-100',
    yellow: 'bg-yellow-100',
  };
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center mb-3">
        <div className={`w-10 h-10 ${bgMap[color] || 'bg-gray-100'} rounded-lg flex items-center justify-center mr-3`}>
          {icon}
        </div>
        <h5 className="font-bold text-gray-800">{title}</h5>
      </div>
      <p className="text-sm text-gray-600">{desc}</p>
    </div>
  );
}
