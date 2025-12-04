export function CompanyOverviewSection() {
  return (
    <section id="hero-section" className="brand-section-px brand-section-py **:brand-stretch **:font-raleway mx-auto flex max-w-[1440px] flex-col pt-20">
      <div className="mx-auto w-xs sm:w-md lg:w-2xl xl:w-3xl">
        <h2 className="brand-h1 text-brand-burgundy w-full text-center leading-[125%] text-balance">
          Company <span className="brand-h1-semi text-brand-black"> Overview</span>
        </h2>
        <p className="brand-p-desc text-brand-black text-center">
          Kami berdiri dengan tujuan membantu individu dan perusahaan menavigasi proses legal dan administrasi di Indonesia. Dengan pengalaman bertahun-tahun, kami menyediakan layanan yang
          profesional, jelas, dan transparan.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-20">
        <div className="mx-auto w-xs sm:w-md lg:w-full">
          <h3 className="brand-h1 text-brand-burgundy w-full text-center leading-[125%] text-balance">Vision</h3>
          <p className="brand-p text-brand-black text-center">
            Menjadi konsultan hukum dan imigrasi terpercaya di Indonesia, yang dikenal akan profesionalisme, integritas, dan solusi yang tepat bagi setiap klien.
          </p>
        </div>
        <div className="mx-auto w-xs sm:w-md lg:w-full">
          <h3 className="brand-h1 text-brand-burgundy w-full text-center leading-[125%] text-balance">Mision</h3>
          <p className="brand-p text-brand-black text-center">
            Memberikan layanan legal yang jelas & dapat dipahami, Menyederhanakan proses administrasi & imigrasi, Menyediakan solusi yang personal & efektif, Menjaga integritas dalam setiap proses,
            Mendukung klien dalam pengambilan keputusan.
          </p>
        </div>
      </div>
    </section>
  );
}
