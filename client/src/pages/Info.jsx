import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function Info() {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const sectionId = location.hash.replace("#", "");
    const target = document.getElementById(sectionId);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [location.hash]);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        <section className="relative overflow-hidden rounded-xl shadow bg-white border border-gray-200">
          <div className="absolute -top-14 -right-14 w-56 h-56 rounded-full bg-[#E7A027]/42" />
          <div className="absolute -bottom-16 -left-10 w-48 h-48 rounded-full bg-[#15436b]/40" />

          <div className="relative p-10 md:p-12">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold tracking-wide bg-[#15436b] text-white mb-4">
              GLORY HARBOR
            </span>
            <h1 className="text-3xl md:text-4xl font-bold text-[#15436b] mb-3">About Us</h1>
            <p className="max-w-3xl text-gray-700 leading-relaxed">
              Strong Tower Glorious Church International, Glory Harbor campus is a Pentecostal denomination located in Parkville, MD.
            </p>
          </div>
        </section>

        <section id="history" className="scroll-mt-28 bg-white rounded-xl shadow overflow-hidden">
          <div className="grid md:grid-cols-2">
            <img src="/history-image.jpg" alt="Who We Are" className="w-full h-72 md:h-full object-cover" />
            <div className="p-8">
              <h2 className="text-2xl font-bold text-[#15436b] mb-4">WHO WE ARE</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Strong Tower Glorious Church International, Glory Harbor campus is a Pentecostal denomination located in Parkville, MD. We are sent to take the gospel of Jesus Christ throughout the whole world with supernatural demonstration of his power through teaching, preaching and discipleship.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                This Ministry through its yearly Global Holy Ghost conference and 12-hour Prayer Marathon, believe everyone should have a personal experience with God through the Baptism of the Holy Spirit. With prayer being the key to the total transformation of the spirit, soul and body that helps us fulfill our mandate of positively impacting our world.
              </p>
              <p className="text-gray-700 leading-relaxed">
                Strong Tower Glorious Church International is affiliated with Touch of the Holy Spirit Ministry, Nigeria.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl shadow p-8 border-t-4 border-[#E7A027]">
          <h2 className="text-2xl font-bold text-[#15436b] mb-4">OUR MANDATE</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            After pastoring with a Church for many years, the Lord spoke to the Set man, Pastor Akinde that it was time to start a new work, subsequently, Strong Tower Glorious Church International was birthed October 30, 1999.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4 italic border-l-4 border-[#E7A027] pl-4 bg-gray-50 py-3 rounded-r">
            “Moreover, I will appoint a place for My people Israel, and will plant them, that they may dwell in a place of their own and move no more; nor shall the sons of wickedness oppress them anymore, as previously.”
          </p>
          <p className="text-gray-700 leading-relaxed">
            The church currently has its affiliate all over Nigeria and now in the USA.
          </p>
        </section>

        <section id="community" className="scroll-mt-28 bg-white rounded-xl shadow overflow-hidden">
          <div className="grid md:grid-cols-2">
            <img src="/community-image.jpg" alt="Our Community" className="w-full h-72 md:h-full object-cover" />
            <div className="p-8">
              <h2 className="text-2xl font-bold text-[#15436b] mb-4">OUR COMMUNITY</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We are currently located in Parkville, MD where we reach out to our immediate community to demonstrate the love of Christ and the gifts of the Holy Spirit.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                Our church is blessed to have a culturally diverse congregation of people from all over the world. Everyone feels at home at Glory Harbor, a safe place where God’s glory radiates!
              </p>
              <p className="text-gray-700 leading-relaxed">
                We also have many spirit filled programs geared towards preparing God’s children for His second return.
              </p>
            </div>
          </div>
        </section>

        <section id="beliefs" className="scroll-mt-28 bg-white rounded-xl shadow p-8 border-t-4 border-[#15436b]">
          <h2 className="text-2xl font-bold text-[#15436b] mb-4">OUR TENETS OF FAITH</h2>
          <ul className="space-y-3 text-gray-700 leading-relaxed list-disc pl-5">
            <li>The divine inspiration and authority of the Holy Bible.</li>
            <li>The unity of the Godhead and the Trinity of Persons therein.</li>
            <li>Prayer and evangelism are essential keys to helping believers fulfil the mandate of the Gospel.</li>
            <li>The necessity for repentance and regeneration; and the eternal doom of the finally impenitent.</li>
            <li>The virgin birth, Sinless life, Atoning death, Triumphant Resurrection, Ascension, Abiding intercession of Our Lord Jesus Christ, and His Second coming.</li>
            <li>Justification and Sanctification of the believers through the finished work of Christ.</li>
            <li>The sacrament of baptism by immersion and of the Lord’s supper.</li>
            <li>The baptism of the Holy Ghost for the believers with signs following.</li>
            <li>The nine gifts of the Holy Ghost for the edification, exhorting and comfort of the Church, which is the body of Christ.</li>
            <li>Church government by Apostles, Prophets, Evangelists, Pastors and Teachers.</li>
            <li>The obligatory nature of tithes and offering.</li>
            <li>Divine healing through obedience to the commandment of our Lord Jesus Christ and faith in His name and merit of His blood for all.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
