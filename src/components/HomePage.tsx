import { Card } from "@/components/ui/card";

const AGENDA = [
  { time: "9:00 AM", title: "Registration & Breadcrumbs", speaker: null },
  { time: "10:00 AM", title: "Opening Keynote: The Future of Honking", speaker: "Honker McWaddle" },
  { time: "11:00 AM", title: "Building on the Gaggle Protocol", speaker: "Gander Featherton" },
  { time: "12:00 PM", title: "Pond Break", speaker: null },
  { time: "1:30 PM", title: "Identity and Authentication in Goose Networks", speaker: "Gosling Rivers" },
  { time: "2:30 PM", title: "Scaling V-Formation Networks", speaker: "Migratus Wingsworth" },
  { time: "3:30 PM", title: "Closing Honks & Waddling", speaker: null },
];

const SPEAKERS = [
  {
    name: "Honker McWaddle",
    title: "Chief Honking Officer",
    company: "Goose Labs",
    bio: "Honkus migratium featherus, waddle pondus breadcrumbum gatheram. Wing wing formation flyus southwardus.",
  },
  {
    name: "Gander Featherton",
    title: "Migration Architect",
    company: "The Flock Foundation",
    bio: "Gaggleus protocolum honkus, nestum buildus grassum eaticus. Hissus defensivum territorium guardianus.",
  },
  {
    name: "Gosling Rivers",
    title: "Senior Waddle Engineer",
    company: "Honk Industries",
    bio: "Fluffius downum yellowus, followus motherus pondside walkum. Swimmius learnum quickus paddlefeet.",
  },
  {
    name: "Migratus Wingsworth",
    title: "V-Formation Lead",
    company: "Waddle Works",
    bio: "Aerodynamicus flightus efficientum, takeus turnus leadingum formationus. Honkus encourageum flockmates.",
  },
];

const SPONSORS = [
  { name: "Goose Labs" },
  { name: "The Flock Foundation" },
  { name: "Honk Industries" },
  { name: "Waddle Works" },
  { name: "Feathersoft" },
];

export function HomePage() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-12">
        {/* Hero Section */}
        <Card className="w-full text-center py-12 px-8">
          <img
            src="https://do3z7e6uuakno.cloudfront.net/uploads/event/logo/1152732/5d74de6fb26f78a66e93147e5d5068e0.png"
            alt="Atmosphere Conference"
            className="h-24 mx-auto mb-6"
          />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Atmosphere Conference
          </h1>
          <p className="text-gray-500">March 26-29, 2026 • Vancouver, BC, Canada</p>
        </Card>

        {/* Agenda Section */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Agenda</h2>
          <Card>
            {AGENDA.map((item, index) => (
              <div key={index} className="flex items-center p-4">
                <div className="w-24 flex-shrink-0 text-sm font-medium text-gray-500">
                  {item.time}
                </div>
                <div className="ml-4">
                  <div className="font-medium text-gray-900">{item.title}</div>
                  {item.speaker && (
                    <div className="text-sm text-gray-500">{item.speaker}</div>
                  )}
                </div>
              </div>
            ))}
          </Card>
        </section>

        {/* Speakers Section */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Speakers</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SPEAKERS.map((speaker, index) => (
              <Card key={index} className="p-6">
                <div className="flex gap-4">
                  <div className="w-16 h-16 rounded-full bg-gray-200 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-gray-900">{speaker.name}</div>
                    <div className="text-sm text-gray-600">
                      {speaker.title} at {speaker.company}
                    </div>
                    <p className="text-sm text-gray-500 mt-2">{speaker.bio}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Sponsors Section */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Sponsors</h2>
          <Card className="p-6">
            <div className="flex flex-wrap justify-center gap-8">
              {SPONSORS.map((sponsor, index) => (
                <div
                  key={index}
                  className="w-32 h-16 bg-gray-100 rounded flex items-center justify-center text-sm text-gray-600 font-medium"
                >
                  {sponsor.name}
                </div>
              ))}
            </div>
          </Card>
        </section>
    </div>
  );
}
