const testCases = [
  {
    id: 1,
    question: "When was the Asteria Deep-Sea Research Station inaugurated?",
    expectedAnswer: "The Asteria Deep-Sea Research Station was inaugurated in 2018."
  },
  {
    id: 2,
    question: "Approximately how far is the station from the nearest coastline?",
    expectedAnswer: "The station is approximately 140 kilometers from the nearest coastline."
  },
  {
    id: 3,
    question: "What types of scientists was the station designed to support?",
    expectedAnswer: "The station was designed to support marine biologists, oceanographers, and climate scientists."
  },
  {
    id: 4,
    question: "How many researchers can the station accommodate, and how many usually work there?",
    expectedAnswer: "The station can accommodate thirty researchers but usually operates with a rotating team of eighteen specialists."
  },
  {
    id: 5,
    question: "How long can researchers remain underwater during a mission?",
    expectedAnswer: "Researchers can remain underwater for missions lasting up to six weeks."
  },
  {
    id: 6,
    question: "What is the primary source of power for the station?",
    expectedAnswer: "The station is powered primarily by tidal energy generators."
  },
  {
    id: 7,
    question: "How long can the station continue operating if the tidal generators fail?",
    expectedAnswer: "The battery reserves can sustain full operation for twelve days."
  },
  {
    id: 8,
    question: "How is fresh water produced at the station?",
    expectedAnswer: "Fresh water is produced using desalination units that process nearly 15,000 liters of seawater each day."
  },
  {
    id: 9,
    question: "What major scientific discovery was made in 2021?",
    expectedAnswer: "Researchers discovered a previously unknown species of bioluminescent crustacean."
  },
  {
    id: 10,
    question: "At what depth was the new crustacean discovered?",
    expectedAnswer: "It was discovered nearly 3,800 meters below sea level."
  },
  {
    id: 11,
    question: "Under what condition did the crustacean emit blue-green light?",
    expectedAnswer: "It emitted blue-green light only during cooperative hunting behavior."
  },
  {
    id: 12,
    question: "Why was the crustacean discovery scientifically significant?",
    expectedAnswer: "It challenged the previous assumption that bioluminescence in similar species was primarily defensive."
  },
  {
    id: 13,
    question: "How does the station monitor underwater volcanic activity?",
    expectedAnswer: "The station uses a distributed network of seismic sensors."
  },
  {
    id: 14,
    question: "How many seismic events were detected during late 2022?",
    expectedAnswer: "More than 600 minor seismic events were detected."
  },
  {
    id: 15,
    question: "Did a major volcanic eruption occur during the increased seismic activity?",
    expectedAnswer: "No. Although more than 600 minor seismic events were detected, no major eruption occurred."
  },
  {
    id: 16,
    question: "What conclusion did scientists reach after monitoring the seismic activity?",
    expectedAnswer: "Scientists concluded that magma was moving beneath the seabed but remained confined within deeper geological layers."
  },
  {
    id: 17,
    question: "How is non-recyclable waste handled?",
    expectedAnswer: "Non-recyclable waste is compressed and transported back to the mainland every month."
  },
  {
    id: 18,
    question: "How is organic waste reused?",
    expectedAnswer: "Organic waste is processed using a compact biodigester that produces methane, which is reused as an emergency fuel source for heating."
  },
  {
    id: 19,
    question: "By approximately what percentage has external fuel dependence been reduced?",
    expectedAnswer: "External fuel dependence has been reduced by nearly 40 percent."
  },
  {
    id: 20,
    question: "How does the station communicate with the surface?",
    expectedAnswer: "The station communicates using a hybrid system that combines acoustic underwater transmission with satellite relays through an automated buoy."
  },
  {
    id: 21,
    question: "What happens to communication during severe storms?",
    expectedAnswer: "Severe storms can disrupt satellite connectivity, forcing the station to rely only on slower acoustic communication channels."
  },
  {
    id: 22,
    question: "Summarize the station's environmental sustainability measures.",
    expectedAnswer: "The station minimizes environmental impact by compressing and transporting non-recyclable waste to the mainland, processing organic waste in a biodigester to produce methane for emergency heating, and reducing external fuel dependence by nearly 40 percent through energy recovery initiatives."
  },
  {
    id: 23,
    question: "What are the station's main scientific responsibilities?",
    expectedAnswer: "The station supports long-term research on deep-sea ecosystems, studies marine biology, oceanography and climate science, monitors underwater volcanic activity, and investigates deep-sea species."
  },
  {
    id: 24,
    question: "What systems allow the station to remain operational for long periods underwater?",
    expectedAnswer: "The station remains operational through tidal energy generators with battery backup, desalination units for fresh water, waste recycling systems, and a hybrid acoustic-satellite communication system."
  },
  {
    id: 25,
    question: "Describe the station in a few sentences.",
    expectedAnswer: "The Asteria Deep-Sea Research Station is an underwater research facility inaugurated in 2018 to support long-term marine and climate research. It operates with eighteen specialists, uses renewable tidal energy with battery backup, has made important biological discoveries, monitors underwater volcanic activity, and employs sustainable waste management and hybrid communication systems."
  }
];

export default testCases;