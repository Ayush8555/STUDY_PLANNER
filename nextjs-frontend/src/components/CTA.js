const CTA = () => {
  return (
    <section className="py-8 pb-32">
      <div className="container">
        <div className="bg-primary rounded-3xl p-12 md:p-16 text-center text-white shadow-2xl shadow-primary/20 bg-gradient-to-br from-white/10 to-transparent flex flex-col items-center">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4 tracking-tight">Ready to ace your next exam?</h2>
          <p className="text-lg text-white/90 mb-8 max-w-2xl">Join thousands of students using AI to optimize their study hours and achieve top ranks.</p>
          <a href="#start" className="inline-flex items-center justify-center px-8 py-3.5 rounded-lg text-base font-bold text-primary bg-white hover:bg-gray-50 shadow-lg hover:-translate-y-0.5 transition-all">Get Started for Free</a>
        </div>
      </div>
    </section>
  );
};

export default CTA;
