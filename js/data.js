/* =========================================================
   Inhalte: Himmelskörper, Fakten, Quiz, Missionen
   Alle Zahlen gerundet und kindgerecht formuliert.
   ========================================================= */
window.SPACE_DATA = {
  bodies: [
    {
      id: "sonne", name: "Sonne", kind: "Stern", emoji: "☀️",
      color: "#ffb531",
      radius: 18, distance: 0, orbitYears: 0, tilt: 7,
      diameterKm: 1392000, distanceKm: 0,
      day: "ca. 27 Erdtage", year: "–",
      tempText: "5.500 °C (außen)", tempC: 5500,
      moons: "0", gravity: 28,
      intro: "Die Sonne ist ein riesiger Stern – eine glühende Kugel aus heißem Gas. Sie schenkt uns Licht und Wärme. Ohne sie gäbe es kein Leben auf der Erde!",
      facts: [
        "In die Sonne würden ungefähr 1,3 Millionen Erden hineinpassen!",
        "Das Licht der Sonne braucht ungefähr 8 Minuten, bis es bei uns auf der Erde ankommt.",
        "In ihrem Inneren ist die Sonne etwa 15 Millionen Grad heiß.",
        "Die Sonne ist ungefähr 4,6 Milliarden Jahre alt – und scheint noch Milliarden Jahre weiter.",
        "Schau niemals direkt in die Sonne – das schadet deinen Augen!"
      ],
      quiz: [
        { q: "Was ist die Sonne?", a: ["Ein Stern", "Ein Planet", "Ein Mond"], c: 0, why: "Die Sonne ist ein Stern – der Stern, der uns am nächsten ist." },
        { q: "Wie lange braucht das Sonnenlicht bis zur Erde?", a: ["1 Sekunde", "Etwa 8 Minuten", "Einen ganzen Tag"], c: 1, why: "Das Licht ist ungefähr 8 Minuten unterwegs." },
        { q: "Wie viele Erden passen ungefähr in die Sonne?", a: ["10", "1.000", "1,3 Millionen"], c: 2, why: "Die Sonne ist so riesig, dass etwa 1,3 Millionen Erden hineinpassen." }
      ]
    },
    {
      id: "merkur", name: "Merkur", kind: "Gesteinsplanet", emoji: "🪨",
      color: "#a9a39b",
      radius: 1.6, distance: 42, orbitYears: 0.24, tilt: 0,
      diameterKm: 4879, distanceKm: 58000000,
      day: "176 Erdtage", year: "88 Erdtage",
      tempText: "−180 °C bis 430 °C", tempC: 170, tempMin: -180, tempMax: 430,
      moons: "0", gravity: 0.38,
      intro: "Merkur ist der kleinste Planet und der Sonne am nächsten. Er sieht ein bisschen aus wie unser Mond – voller Krater!",
      facts: [
        "Ein Jahr auf dem Merkur dauert nur 88 Tage – so schnell saust er um die Sonne.",
        "Tagsüber ist es glühend heiß, nachts eiskalt – weil Merkur keine schützende Lufthülle hat.",
        "Merkur ist nur ein kleines bisschen größer als unser Mond.",
        "Merkur hat keinen einzigen Mond."
      ],
      quiz: [
        { q: "Welcher Planet ist der Sonne am nächsten?", a: ["Venus", "Merkur", "Mars"], c: 1, why: "Merkur ist der innerste Planet." },
        { q: "Wie lange dauert ein Jahr auf dem Merkur?", a: ["88 Tage", "365 Tage", "12 Jahre"], c: 0, why: "Merkur braucht nur 88 Tage für eine Runde um die Sonne." },
        { q: "Wie viele Monde hat Merkur?", a: ["Keinen", "Einen", "Zwei"], c: 0, why: "Merkur hat keinen Mond." }
      ]
    },
    {
      id: "venus", name: "Venus", kind: "Gesteinsplanet", emoji: "🌋",
      color: "#e8c27a",
      radius: 2.8, distance: 60, orbitYears: 0.62, tilt: 177,
      diameterKm: 12104, distanceKm: 108000000,
      day: "243 Erdtage", year: "225 Erdtage",
      tempText: "etwa 465 °C", tempC: 465,
      moons: "0", gravity: 0.91,
      intro: "Die Venus ist fast so groß wie die Erde. Aber Vorsicht: Sie ist der heißeste Planet! Dicke giftige Wolken halten die Hitze fest wie eine Decke.",
      facts: [
        "Die Venus ist heißer als Merkur, obwohl sie weiter von der Sonne weg ist – ihre dicken Wolken halten die Wärme fest.",
        "Auf der Venus dauert ein Tag länger als ein Jahr!",
        "Die Venus dreht sich andersherum als fast alle anderen Planeten. Dort geht die Sonne im Westen auf.",
        "Am Himmel ist die Venus sehr hell. Man nennt sie auch „Abendstern“ oder „Morgenstern“."
      ],
      quiz: [
        { q: "Welcher Planet ist der heißeste?", a: ["Merkur", "Venus", "Mars"], c: 1, why: "Die Venus – ihre dicken Wolken wirken wie eine riesige Decke." },
        { q: "Wie nennt man die Venus auch?", a: ["Abendstern", "Roter Planet", "Ringplanet"], c: 0, why: "Weil sie abends oder morgens so hell leuchtet." },
        { q: "Was ist auf der Venus besonders?", a: ["Es gibt Ozeane", "Ein Tag ist länger als ein Jahr", "Sie hat 3 Monde"], c: 1, why: "Ein Venus-Tag (243 Erdtage) ist länger als ein Venus-Jahr (225 Erdtage)." }
      ]
    },
    {
      id: "erde", name: "Erde", kind: "Gesteinsplanet", emoji: "🌍",
      color: "#3b82f6",
      radius: 3, distance: 82, orbitYears: 1, tilt: 23.4,
      diameterKm: 12742, distanceKm: 150000000,
      day: "24 Stunden", year: "365 Tage",
      tempText: "etwa 15 °C (Durchschnitt)", tempC: 15,
      moons: "1", gravity: 1,
      intro: "Die Erde ist unser Zuhause! Sie ist der einzige Planet, von dem wir wissen, dass es dort Leben gibt – Menschen, Tiere und Pflanzen.",
      facts: [
        "Ungefähr zwei Drittel der Erde sind mit Wasser bedeckt. Darum nennt man sie den „Blauen Planeten“.",
        "Die Erde dreht sich einmal am Tag um sich selbst – so entstehen Tag und Nacht.",
        "Für eine Runde um die Sonne braucht die Erde ein Jahr: 365 Tage.",
        "Die Luft um die Erde (die Atmosphäre) schützt uns wie ein Schild."
      ],
      quiz: [
        { q: "Warum heißt die Erde „Blauer Planet“?", a: ["Wegen des vielen Wassers", "Weil sie kalt ist", "Wegen blauer Steine"], c: 0, why: "Rund zwei Drittel der Erde sind mit Wasser bedeckt." },
        { q: "Wodurch entstehen Tag und Nacht?", a: ["Der Mond verdeckt die Sonne", "Die Erde dreht sich um sich selbst", "Die Sonne geht aus"], c: 1, why: "Die Erde dreht sich einmal in 24 Stunden um sich selbst." },
        { q: "Der wievielte Planet von der Sonne aus ist die Erde?", a: ["Der 2.", "Der 3.", "Der 5."], c: 1, why: "Merkur, Venus, Erde – die Erde ist Nummer 3." }
      ]
    },
    {
      id: "mond", name: "Mond", kind: "Mond der Erde", emoji: "🌙",
      color: "#cfcfcf",
      radius: 0.85, parent: "erde", distance: 7, orbitYears: 0.075, tilt: 0,
      diameterKm: 3474, distanceKm: 384400, distanceFrom: "Erde",
      day: "ca. 27 Erdtage", year: "27 Tage um die Erde",
      tempText: "−170 °C bis 120 °C", tempC: -25, tempMin: -170, tempMax: 120,
      moons: "–", gravity: 0.17,
      intro: "Der Mond ist der treue Begleiter der Erde. Er leuchtet nicht selbst – er wird von der Sonne angestrahlt, wie ein Spiegel.",
      facts: [
        "1969 betraten die ersten Menschen den Mond. Neil Armstrong war der Erste.",
        "Auf dem Mond gibt es keinen Wind – die Fußabdrücke der Astronauten sind heute noch da!",
        "Der Mond zeigt uns immer dieselbe Seite.",
        "Auf dem Mond bist du nur ein Sechstel so schwer – du könntest super hoch springen!"
      ],
      quiz: [
        { q: "Leuchtet der Mond selbst?", a: ["Ja, wie eine Lampe", "Nein, die Sonne strahlt ihn an", "Nur bei Vollmond"], c: 1, why: "Der Mond wirft das Sonnenlicht zurück." },
        { q: "Wann waren die ersten Menschen auf dem Mond?", a: ["1869", "1969", "2019"], c: 1, why: "Am 21. Juli 1969 betrat Neil Armstrong den Mond." },
        { q: "Warum bleiben Fußabdrücke auf dem Mond so lange?", a: ["Es gibt keinen Wind", "Der Boden ist aus Beton", "Es regnet dort Kleber"], c: 0, why: "Ohne Luft gibt es keinen Wind, der sie wegweht." }
      ]
    },
    {
      id: "mars", name: "Mars", kind: "Gesteinsplanet", emoji: "🔴",
      color: "#d9623b",
      radius: 2.1, distance: 106, orbitYears: 1.88, tilt: 25,
      diameterKm: 6779, distanceKm: 228000000,
      day: "24 Std. 37 Min.", year: "687 Erdtage",
      tempText: "etwa −60 °C", tempC: -60,
      moons: "2", gravity: 0.38,
      intro: "Der Mars ist der „Rote Planet“. Seine Farbe kommt von Rost im Staub! Forscher-Roboter fahren dort herum und suchen nach Spuren von Wasser.",
      facts: [
        "Auf dem Mars steht der höchste Vulkan im ganzen Sonnensystem: der Olympus Mons. Er ist etwa zweieinhalbmal so hoch wie der Mount Everest!",
        "Mars hat zwei kleine Monde: Phobos und Deimos.",
        "Ein Tag auf dem Mars ist nur etwas länger als bei uns.",
        "Auf dem Mars gibt es manchmal riesige Staubstürme, die den ganzen Planeten bedecken."
      ],
      quiz: [
        { q: "Warum ist der Mars rot?", a: ["Er ist sehr heiß", "Rost im Staub", "Rote Pflanzen"], c: 1, why: "Im Marsstaub steckt viel Eisenoxid – also Rost." },
        { q: "Wie heißt der höchste Vulkan des Sonnensystems?", a: ["Olympus Mons", "Ätna", "Mount Everest"], c: 0, why: "Der Olympus Mons auf dem Mars ist etwa 22 km hoch." },
        { q: "Wie viele Monde hat der Mars?", a: ["Keinen", "Zwei", "Zehn"], c: 1, why: "Phobos und Deimos." }
      ]
    },
    {
      id: "jupiter", name: "Jupiter", kind: "Gasriese", emoji: "🟠",
      color: "#d9a066",
      radius: 9, distance: 170, orbitYears: 11.9, tilt: 3,
      diameterKm: 139820, distanceKm: 778000000,
      day: "ca. 10 Stunden", year: "ca. 12 Erdjahre",
      tempText: "etwa −110 °C", tempC: -110,
      moons: "über 90", gravity: 2.4,
      intro: "Jupiter ist der größte Planet – ein Riese aus Gas! Man könnte nicht auf ihm landen, denn er hat keinen festen Boden.",
      facts: [
        "In den Jupiter würden mehr als 1.300 Erden passen!",
        "Der „Große Rote Fleck“ ist ein riesiger Sturm – größer als die ganze Erde. Er tobt schon seit fast 200 Jahren.",
        "Jupiter dreht sich am schnellsten: Ein Tag dauert nur etwa 10 Stunden.",
        "Jupiter hat über 90 Monde. Der größte heißt Ganymed und ist sogar größer als Merkur."
      ],
      quiz: [
        { q: "Welcher Planet ist der größte?", a: ["Saturn", "Erde", "Jupiter"], c: 2, why: "Jupiter ist der Riese unter den Planeten." },
        { q: "Was ist der Große Rote Fleck?", a: ["Ein Vulkan", "Ein riesiger Sturm", "Ein Meer"], c: 1, why: "Ein Wirbelsturm, größer als die Erde." },
        { q: "Kann man auf Jupiter landen?", a: ["Ja, auf Sand", "Nein, er hat keinen festen Boden", "Ja, auf Eis"], c: 1, why: "Jupiter ist ein Gasriese – ohne festen Boden." }
      ]
    },
    {
      id: "saturn", name: "Saturn", kind: "Gasriese", emoji: "🪐",
      color: "#e3c98f",
      radius: 7.5, distance: 222, orbitYears: 29.5, tilt: 27, rings: true,
      diameterKm: 116460, distanceKm: 1430000000,
      day: "ca. 10,5 Stunden", year: "ca. 29 Erdjahre",
      tempText: "etwa −140 °C", tempC: -140,
      moons: "über 200", gravity: 1.07,
      intro: "Saturn ist der Planet mit den berühmten Ringen! Die Ringe bestehen aus unzähligen Brocken aus Eis und Gestein – manche so klein wie Sandkörner, manche so groß wie ein Haus.",
      facts: [
        "Saturn ist so leicht, dass er in einer riesigen Badewanne schwimmen würde!",
        "Saturn hat mehr Monde als jeder andere Planet – über 200!",
        "Sein größter Mond Titan hat eine dicke Lufthülle und Seen – aber nicht aus Wasser, sondern aus flüssigem Gas.",
        "Die Ringe sind riesig breit – aber an vielen Stellen nur etwa so dick wie ein Haus hoch ist!"
      ],
      quiz: [
        { q: "Woraus bestehen Saturns Ringe?", a: ["Aus Eis und Gestein", "Aus Gold", "Aus Licht"], c: 0, why: "Aus unzähligen Brocken aus Eis und Gestein." },
        { q: "Was würde Saturn in einer riesigen Badewanne tun?", a: ["Untergehen", "Schwimmen", "Explodieren"], c: 1, why: "Saturn ist leichter als die gleiche Menge Wasser." },
        { q: "Wie heißt Saturns größter Mond?", a: ["Titan", "Phobos", "Luna"], c: 0, why: "Titan – mit Seen aus flüssigem Gas." }
      ]
    },
    {
      id: "uranus", name: "Uranus", kind: "Eisriese", emoji: "🧊",
      color: "#8fd8e3",
      radius: 5, distance: 268, orbitYears: 84, tilt: 98, rings: true, faintRings: true,
      diameterKm: 50724, distanceKm: 2870000000,
      day: "ca. 17 Stunden", year: "84 Erdjahre",
      tempText: "etwa −195 °C", tempC: -195,
      moons: "über 25", gravity: 0.9,
      intro: "Uranus ist ein eisblauer Riese – und ein echter Querkopf: Er liegt auf der Seite und rollt wie eine Kugel um die Sonne!",
      facts: [
        "Uranus ist der kälteste Planet: Es kann bis zu −224 °C kalt werden.",
        "Er wurde als erster Planet mit einem Fernrohr entdeckt – im Jahr 1781.",
        "Weil Uranus auf der Seite liegt, dauert ein Sommer dort 42 Jahre!",
        "Seine Monde sind nach Figuren aus Theaterstücken benannt, zum Beispiel Titania und Oberon."
      ],
      quiz: [
        { q: "Was ist besonders an Uranus?", a: ["Er ist ganz aus Gold", "Er liegt auf der Seite", "Er ist der heißeste Planet"], c: 1, why: "Uranus ist stark gekippt und „rollt“ um die Sonne." },
        { q: "Welche Farbe hat Uranus?", a: ["Rot", "Eisblau / Türkis", "Gelb"], c: 1, why: "Ein Gas namens Methan lässt ihn blaugrün aussehen." },
        { q: "Womit wurde Uranus entdeckt?", a: ["Mit einem Fernrohr", "Mit bloßem Auge", "Mit einer Rakete"], c: 0, why: "1781 von Wilhelm Herschel mit einem Fernrohr." }
      ]
    },
    {
      id: "neptun", name: "Neptun", kind: "Eisriese", emoji: "🌊",
      color: "#3d62e0",
      radius: 4.8, distance: 312, orbitYears: 165, tilt: 28,
      diameterKm: 49244, distanceKm: 4500000000,
      day: "ca. 16 Stunden", year: "165 Erdjahre",
      tempText: "etwa −200 °C", tempC: -200,
      moons: "über 15", gravity: 1.14,
      intro: "Neptun ist der äußerste Planet – blau, eiskalt und stürmisch! Hier wehen die stärksten Winde im ganzen Sonnensystem.",
      facts: [
        "Auf Neptun toben Winde mit über 2.000 km/h – schneller als ein Düsenflugzeug!",
        "Seit seiner Entdeckung 1846 hat Neptun erst ein einziges Mal die Sonne umrundet.",
        "Sein größter Mond Triton ist eiskalt und hat Eis-Geysire.",
        "Neptun wurde zuerst mit Mathematik berechnet – und dann am Himmel gefunden!"
      ],
      quiz: [
        { q: "Welcher Planet ist am weitesten von der Sonne entfernt?", a: ["Uranus", "Neptun", "Saturn"], c: 1, why: "Neptun ist der achte und äußerste Planet." },
        { q: "Was ist auf Neptun besonders stark?", a: ["Der Wind", "Der Regen aus Schokolade", "Die Hitze"], c: 0, why: "Winde mit über 2.000 km/h!" },
        { q: "Wie heißt Neptuns größter Mond?", a: ["Triton", "Titan", "Deimos"], c: 0, why: "Triton – mit Geysiren aus Eis." }
      ]
    },
    {
      id: "pluto", name: "Pluto", kind: "Zwergplanet", emoji: "🤍",
      color: "#d8c3a5",
      radius: 1.1, distance: 350, orbitYears: 248, tilt: 120,
      diameterKm: 2377, distanceKm: 5900000000,
      day: "ca. 6 Erdtage", year: "248 Erdjahre",
      tempText: "etwa −230 °C", tempC: -230,
      moons: "5", gravity: 0.06,
      intro: "Pluto galt früher als 9. Planet. Seit 2006 nennt man ihn „Zwergplanet“, weil er so klein ist. Er ist kleiner als unser Mond!",
      facts: [
        "Auf Pluto gibt es eine riesige Fläche in Form eines Herzens!",
        "Seit 2006 ist Pluto kein richtiger Planet mehr, sondern ein Zwergplanet.",
        "Die Raumsonde New Horizons ist 2015 an Pluto vorbeigeflogen und hat Fotos gemacht.",
        "Ein Jahr auf Pluto dauert 248 Erdjahre."
      ],
      quiz: [
        { q: "Was ist Pluto heute?", a: ["Ein Zwergplanet", "Ein Stern", "Ein Komet"], c: 0, why: "Seit 2006 zählt Pluto zu den Zwergplaneten." },
        { q: "Welche Form hat eine große Fläche auf Pluto?", a: ["Ein Stern", "Ein Herz", "Ein Quadrat"], c: 1, why: "Die Tombaugh-Region sieht aus wie ein Herz." },
        { q: "Ist Pluto größer oder kleiner als unser Mond?", a: ["Größer", "Kleiner", "Genau gleich"], c: 1, why: "Pluto ist sogar kleiner als der Erdmond." }
      ]
    }
  ],

  /* Missionen: Rätsel, die zu einem Ziel führen */
  missions: [
    { target: "sonne",   text: "Fliege zu dem Stern, der uns Licht und Wärme schenkt!" },
    { target: "erde",    text: "Finde unseren Heimatplaneten – den blauen Planeten!" },
    { target: "mond",    text: "Besuche den treuen Begleiter der Erde." },
    { target: "mars",    text: "Finde den Roten Planeten." },
    { target: "venus",   text: "Finde den heißesten Planeten im Sonnensystem." },
    { target: "merkur",  text: "Welcher Planet ist der Sonne am allernächsten? Fliege hin!" },
    { target: "jupiter", text: "Fliege zum größten Planeten – dem Riesen mit dem roten Fleck." },
    { target: "saturn",  text: "Finde den Planeten mit den schönsten Ringen." },
    { target: "uranus",  text: "Finde den eisblauen Planeten, der auf der Seite liegt." },
    { target: "neptun",  text: "Fliege zum stürmischen blauen Planeten ganz außen." },
    { target: "pluto",   text: "Suche den kleinen Zwergplaneten mit dem Herz." },
    { target: "#order",  text: "Letzte Mission: Bringe alle Planeten in die richtige Reihenfolge!" }
  ],

  planetOrder: ["merkur", "venus", "erde", "mars", "jupiter", "saturn", "uranus", "neptun"],
  // Versionsnummer (steht in der Hilfe) – bei jeder Veröffentlichung hochzählen, zusammen mit VERSION in sw.js
  version: "10",

  mnemonic: "Mein Vater erklärt mir jeden Sonntag unsere Nachbarplaneten.",

  /* Aussteigen & selbst erkunden (bisher: Mond).
     {name} = Name des Kindes, {rest} = noch offene Entdeckungen, {hoehe} = gemessene Sprunghöhe */
  surfaces: {
    mond: {
      gravity: 1.62, // m/s² – echte Mond-Schwerkraft (Erde: 9,81)
      discoveries: [
        { key: "sprung", icon: "🦘", title: "Leichte Anziehung",
          text: "Du bist {hoehe} hoch gesprungen und {zeit} Sekunden durch die Luft geschwebt! Mit genau demselben Absprung kämst du auf der Erde nur ein Sechstel so hoch – der Mond zieht nur ein Sechstel so stark. Meterhoch geht es trotzdem nicht: Raumanzug und Rucksack wiegen zusammen fast so viel wie ein Erwachsener. So ähnlich ist Astronaut John Young 1972 für ein berühmtes Foto gesprungen." },
        { key: "apollo", icon: "👣", title: "Die erste Mondlandung", photo: "mond-1.jpg",
          text: "Hier in der Nähe landeten im Juli 1969 Neil Armstrong und Buzz Aldrin mit der Mondfähre „Eagle“ – als allererste Menschen auf dem Mond! Das Unterteil der Fähre steht noch heute dort. Und ihre Fußabdrücke sind bis heute zu sehen: Auf dem Mond gibt es keinen Wind und keinen Regen, der sie verweht." },
        { key: "himmel", icon: "🔭", title: "Schwarzer Himmel", photo: "erde-1.jpg",
          text: "Obwohl die Sonne scheint, ist der Himmel schwarz! Auf der Erde verteilt die Luft das Sonnenlicht und macht den Himmel blau – auf dem Mond gibt es keine Luft. Und da oben schwebt unsere Erde: Vom Mond aus sieht sie fast 4-mal so groß aus wie der Mond bei uns am Himmel." },
        { key: "temperatur", icon: "🌡️", title: "Hitze und Kälte",
          text: "Hast du das Thermometer gesehen? In der Sonne wird der Mondboden bis zu 120 °C heiß. Im Schatten und in der Mondnacht wird es eiskalt – bis −170 °C! Ohne Luft wird die Wärme nicht verteilt. Nur dein Raumanzug schützt dich." },
        { key: "fallversuch", icon: "🪶", title: "Hammer und Feder",
          text: "Hammer und Feder sind genau gleichzeitig unten angekommen! Auf der Erde bremst die Luft die leichte Feder – sie segelt langsam herab. Auf dem Mond gibt es keine Luft, darum fällt alles gleich schnell. Astronaut Dave Scott hat genau diesen Versuch 1971 auf dem Mond gemacht!" }
      ],
      stations: {
        apollo:      { label: "Landestelle von 1969", hint: "Geh zur Mondfähre" },
        himmel:      { label: "Fernrohr", action: "🔭 Durchschauen" },
        temperatur:  { label: "Schatten am Felsen", hint: "Stell dich in den Schatten" },
        fallversuch: { label: "Experiment-Tisch", action: "🪶 Hammer & Feder fallen lassen" }
      },
      radio: {
        start: "Hier ist die Bodenstation! Willkommen auf dem Mond, {name}! Hier gibt es 5 Dinge zu entdecken. Die leuchtenden Lichtsäulen zeigen dir, wo. Probier doch zuerst mal zu springen!",
        found: "Klasse Entdeckung! Noch {rest} übrig.",
        back: "Willkommen zurück auf dem Mond, {name}! Dir fehlen noch {rest} Entdeckungen – folge den blauen Lichtsäulen.",
        allFound: "Fantastisch, {name}! Du hast alles entdeckt. Die Bodenstation hat noch 3 Fragen an dich.",
        tooFar: "Bodenstation an {name}: Bitte entferne dich nicht zu weit von der Rakete!",
        quizDone: "Mission erfüllt! Wenn du fertig bist, tippe auf „Einsteigen“ – oder erkunde noch ein bisschen."
      },
      quiz: [
        { q: "Was passiert, wenn du auf dem Mond genauso kräftig abspringst wie auf der Erde?", a: ["Ich komme genauso hoch", "Ich komme etwa 6-mal so hoch und schwebe lange", "Ich fliege ins All davon"], c: 1, why: "Der Mond zieht nur ein Sechstel so stark wie die Erde – man kommt 6-mal so hoch und schwebt lange." },
        { q: "Warum ist der Himmel auf dem Mond schwarz?", a: ["Weil es dort keine Luft gibt", "Weil dort immer Nacht ist", "Weil die Sonne dort nicht scheint"], c: 0, why: "Ohne Luft wird das Sonnenlicht nicht verteilt – der Himmel bleibt schwarz." },
        { q: "Was kommt auf dem Mond zuerst unten an?", a: ["Der Hammer", "Die Feder", "Beide gleichzeitig"], c: 2, why: "Ohne Luft bremst nichts die Feder – alles fällt gleich schnell." }
      ]
    }
  },

  /* Echte Fotos (lokal in img/, verkleinert). Pro Himmelskörper: erst das Gesamtbild, dann Nahaufnahmen.
     Quellen & Lizenzen: siehe BILDNACHWEIS.md */
  photos: {
    "sonne": [
      {
        "file": "sonne.jpg",
        "tag": "Aus dem All",
        "caption": "Die Sonne, durch einen Spezialfilter fotografiert. Die dunklen Punkte sind Sonnenflecken – die kleinen in der Mitte sind ungefähr so groß wie unsere Erde!",
        "credit": "NASA · gemeinfrei",
        "url": "https://commons.wikimedia.org/wiki/File:Sun920607.jpg"
      },
      {
        "file": "sonne-1.jpg",
        "tag": "Ganz nah dran",
        "caption": "So nah wurde die Sonne noch nie fotografiert! Jede „Wabe“ ist eine riesige Blase aus heißem Gas – jede einzelne ist größer als Deutschland.",
        "credit": "NSO / NSF / AURA · CC BY 4.0",
        "url": "https://commons.wikimedia.org/wiki/File:NSF’s_Inouye_Solar_Telescope_First_Light_(cropped)_(NSO-DKIST-firstlight-crop).jpg"
      },
      {
        "file": "sonne-2.jpg",
        "tag": "Ganz nah dran",
        "caption": "Ein Sonnenausbruch: Glühend heißes Gas schießt weit hinaus ins All – viel weiter, als die Erde groß ist.",
        "credit": "NASA / SDO · gemeinfrei",
        "url": "https://commons.wikimedia.org/wiki/File:Solar_Eruption.jpg"
      }
    ],
    "merkur": [
      {
        "file": "merkur.jpg",
        "tag": "Aus dem All",
        "caption": "Merkur, fotografiert von der Raumsonde MESSENGER. Die Farben wurden verstärkt, damit man die verschiedenen Gesteine besser sieht.",
        "credit": "NASA / JHU APL / Carnegie Institution of Washington · gemeinfrei",
        "url": "https://commons.wikimedia.org/wiki/File:Mercury_in_color_-_Prockter07-edit1.jpg"
      },
      {
        "file": "merkur-1.jpg",
        "tag": "Ganz nah dran",
        "caption": "Der Munch-Krater auf Merkur aus der Nähe. Er ist 58 Kilometer breit – größer als die Stadt Berlin!",
        "credit": "NASA / JHU APL / ASU · gemeinfrei",
        "url": "https://commons.wikimedia.org/wiki/File:Munch_crater_on_Mercury.jpg"
      }
    ],
    "venus": [
      {
        "file": "venus.jpg",
        "tag": "Aus dem All",
        "caption": "Die Venus, fotografiert von der Raumsonde Mariner 10. Man sieht nur die dicke Wolkendecke – den Boden darunter kann man nicht sehen!",
        "credit": "NASA / JPL-Caltech · gemeinfrei",
        "url": "https://commons.wikimedia.org/wiki/File:PIA23791-Venus-RealAndEnhancedContrastViews-20200608_(cropped).jpg"
      },
      {
        "file": "venus-1.jpg",
        "tag": "Auf der Oberfläche",
        "caption": "Das ist wirklich der Boden der Venus! 1982 landete dort die Sonde Venera 13 aus der Sowjetunion und funkte dieses Foto zur Erde. Nach etwa 2 Stunden gab sie wegen der Hitze auf.",
        "credit": "UdSSR / NASA · gemeinfrei",
        "url": "https://commons.wikimedia.org/wiki/File:V13_vg261_262.tif"
      }
    ],
    "erde": [
      {
        "file": "erde.jpg",
        "tag": "Aus dem All",
        "caption": "„Blue Marble“ – unsere Erde, fotografiert 1972 von den Astronauten von Apollo 17 auf dem Weg zum Mond.",
        "credit": "NASA / Apollo 17 · gemeinfrei",
        "url": "https://commons.wikimedia.org/wiki/File:The_Blue_Marble_(remastered).jpg"
      },
      {
        "file": "erde-1.jpg",
        "tag": "Vom Mond aus",
        "caption": "„Earthrise“ – der Erdaufgang: 1968 fotografierte der Astronaut Bill Anders, wie die Erde hinter dem Mond aufgeht.",
        "credit": "NASA / Bill Anders · gemeinfrei",
        "url": "https://commons.wikimedia.org/wiki/File:NASA-Apollo8-Dec24-Earthrise.jpg"
      },
      {
        "file": "erde-2.jpg",
        "tag": "Ganz nah dran",
        "caption": "Ein Astronaut steht auf dem Roboterarm der Raumstation ISS und arbeitet draußen im All – tief unter ihm die Erde.",
        "credit": "NASA · gemeinfrei",
        "url": "https://commons.wikimedia.org/wiki/File:STS-114_Steve_Robinson_on_Canadarm2.jpg"
      }
    ],
    "mond": [
      {
        "file": "mond.jpg",
        "tag": "Von der Erde aus",
        "caption": "Der Vollmond, von der Erde aus fotografiert. Die dunklen Flecken nennt man „Meere“ – Wasser gibt es dort aber keins.",
        "credit": "Foto: Luc Viatour · CC BY-SA 3.0",
        "url": "https://commons.wikimedia.org/wiki/File:Full_Moon_Luc_Viatour.jpg"
      },
      {
        "file": "mond-1.jpg",
        "tag": "Mondlandung 1969",
        "caption": "Buzz Aldrin auf dem Mond, 1969. Fotografiert hat ihn Neil Armstrong – in Aldrins Helm kannst du ihn sogar sehen!",
        "credit": "NASA / Neil Armstrong · gemeinfrei",
        "url": "https://commons.wikimedia.org/wiki/File:Aldrin_Apollo_11.jpg"
      },
      {
        "file": "mond-2.jpg",
        "tag": "Mondlandung 1969",
        "caption": "Buzz Aldrin klettert die Leiter der Mondfähre „Eagle“ hinunter – gleich betritt er den Mond.",
        "credit": "NASA / Neil Armstrong · gemeinfrei",
        "url": "https://commons.wikimedia.org/wiki/File:Astronaut_Edwin_Aldrin_descends_the_Lunar_Module_ladder,_AS11-40-5868_(21037483754).jpg"
      },
      {
        "file": "mond-3.jpg",
        "tag": "Auf der Oberfläche",
        "caption": "Ein echter Fußabdruck auf dem Mond! Weil es dort keinen Wind gibt, ist er wahrscheinlich heute noch da.",
        "credit": "NASA / Buzz Aldrin · gemeinfrei",
        "url": "https://commons.wikimedia.org/wiki/File:Apollo_11_bootprint.jpg"
      }
    ],
    "mars": [
      {
        "file": "mars.jpg",
        "tag": "Aus dem All",
        "caption": "Der Mars, aufgenommen von der Raumsonde „Hope“ der Vereinigten Arabischen Emirate.",
        "credit": "EMM/EXI · Bearbeitung: Kevin M. Gill · CC BY 2.0",
        "url": "https://commons.wikimedia.org/wiki/File:Mars_-_August_30_2021_-_Flickr_-_Kevin_M._Gill.png"
      },
      {
        "file": "mars-1.jpg",
        "tag": "Auf der Oberfläche",
        "caption": "Ein Selfie vom Mars! Der Rover „Curiosity“ hat sich mit seinem Roboterarm selbst fotografiert – mitten in einer Sanddüne.",
        "credit": "NASA / JPL-Caltech / MSSS · gemeinfrei",
        "url": "https://commons.wikimedia.org/wiki/File:Curiosity_rover_selfie_at_Namib_Dune_Sol_1128_(53678107023).jpg"
      },
      {
        "file": "mars-2.jpg",
        "tag": "Auf der Oberfläche",
        "caption": "Der Jezero-Krater, fotografiert vom Rover „Perseverance“. Vorne steht der kleine Hubschrauber „Ingenuity“ – das erste Fluggerät, das je auf einem anderen Planeten geflogen ist.",
        "credit": "NASA / JPL-Caltech · gemeinfrei",
        "url": "https://commons.wikimedia.org/wiki/File:Panorama_of_Jezero_crater_on_Mars,_sol_44_of_Perseverance_mission.png"
      }
    ],
    "jupiter": [
      {
        "file": "jupiter.jpg",
        "tag": "Aus dem All",
        "caption": "Jupiter, fotografiert vom Hubble-Weltraumteleskop. Unten rechts siehst du den Großen Roten Fleck!",
        "credit": "NASA / STScI · gemeinfrei",
        "url": "https://commons.wikimedia.org/wiki/File:Jupiter_OPAL_2024_(cropped).png"
      },
      {
        "file": "jupiter-1.jpg",
        "tag": "Ganz nah dran",
        "caption": "Der Große Rote Fleck ganz nah, aufgenommen von der Raumsonde Juno. Dieser Sturm ist größer als die ganze Erde!",
        "credit": "NASA / SwRI / MSSS / Gerald Eichstädt / Seán Doran · gemeinfrei",
        "url": "https://commons.wikimedia.org/wiki/File:Great_red_spot_juno_20170712.jpg"
      },
      {
        "file": "jupiter-2.jpg",
        "tag": "Ganz nah dran",
        "caption": "Jupiter als Sichel mit dem Großen Roten Fleck. Das Bild hat ein Hobby-Forscher aus Daten der Sonde Juno zusammengesetzt.",
        "credit": "NASA / JPL-Caltech / SwRI / MSSS / Roman Tkachenko · gemeinfrei",
        "url": "https://commons.wikimedia.org/wiki/File:PIA21376_-_Crescent_Jupiter_with_the_Great_Red_Spot.jpg"
      }
    ],
    "saturn": [
      {
        "file": "saturn.jpg",
        "tag": "Aus dem All",
        "caption": "Saturn mit seinen Ringen, fotografiert 2004 von der Raumsonde Cassini.",
        "credit": "NASA / JPL / Space Science Institute · gemeinfrei",
        "url": "https://commons.wikimedia.org/wiki/File:Saturn_from_Cassini_Orbiter_(2004-10-06).jpg"
      },
      {
        "file": "saturn-1.jpg",
        "tag": "Ganz nah dran",
        "caption": "Saturn und seine Ringe von oben – so hat die Raumsonde Cassini den Planeten gesehen.",
        "credit": "NASA / JPL-Caltech / SSI / Cornell · gemeinfrei",
        "url": "https://commons.wikimedia.org/wiki/File:Top_view_of_the_rings_of_Saturn_by_Cassini_-_October_10,_2013.jpg"
      },
      {
        "file": "saturn-2.jpg",
        "tag": "Auf dem Mond Titan",
        "caption": "Der Boden von Titan, dem größten Saturnmond! 2005 landete dort die Sonde Huygens. Die „Steine“ sind vermutlich Brocken aus Eis.",
        "credit": "ESA / NASA / JPL / University of Arizona · gemeinfrei",
        "url": "https://commons.wikimedia.org/wiki/File:Huygens_surface_and_sky_of_Titan.jpg"
      }
    ],
    "uranus": [
      {
        "file": "uranus.jpg",
        "tag": "Aus dem All",
        "caption": "Uranus, fotografiert 1986 von Voyager 2 – der einzigen Raumsonde, die jemals dort war.",
        "credit": "NASA / Voyager 2 · Farben: Ardenau4 · CC0",
        "url": "https://commons.wikimedia.org/wiki/File:Uranus_Voyager2_color_calibrated.png"
      },
      {
        "file": "uranus-1.jpg",
        "tag": "Mond Miranda",
        "caption": "Miranda, ein Mond des Uranus, fotografiert von Voyager 2. Dort gibt es riesige Steilwände – bis zu 20 Kilometer tief!",
        "credit": "NASA / JPL · gemeinfrei",
        "url": "https://commons.wikimedia.org/wiki/File:Miranda_as_seen_by_Voyager_2_-_GPN-2003-000005_(cropped).jpg"
      }
    ],
    "neptun": [
      {
        "file": "neptun.jpg",
        "tag": "Aus dem All",
        "caption": "Neptun, fotografiert 1989 von Voyager 2. Neue Messungen zeigen: In echt ist Neptun hellblau, fast wie Uranus – ältere Bilder waren zu dunkel eingefärbt.",
        "credit": "NASA / Voyager 2 · Farben: Ardenau4 · CC0",
        "url": "https://commons.wikimedia.org/wiki/File:Neptune_Voyager2_color_calibrated,_brightened.png"
      },
      {
        "file": "neptun-1.jpg",
        "tag": "Mond Triton",
        "caption": "Triton, der größte Neptunmond, fotografiert von Voyager 2. Die dunklen Streifen stammen von Eis-Geysiren, die Staub in die Luft spucken.",
        "credit": "NASA / JPL / USGS · gemeinfrei",
        "url": "https://commons.wikimedia.org/wiki/File:Triton_moon_mosaic_Voyager_2_(large).jpg"
      }
    ],
    "pluto": [
      {
        "file": "pluto.jpg",
        "tag": "Aus dem All",
        "caption": "Pluto, fotografiert 2015 von der Raumsonde New Horizons. Siehst du das helle Herz?",
        "credit": "NASA / JHU APL / SwRI · gemeinfrei",
        "url": "https://commons.wikimedia.org/wiki/File:Pluto_in_True_Color_-_High-Res.jpg"
      },
      {
        "file": "pluto-1.jpg",
        "tag": "Ganz nah dran",
        "caption": "Plutos Berge und Ebenen, kurz nach dem Vorbeiflug von New Horizons fotografiert. Die Berge bestehen aus Eis – und darüber schweben Nebelschichten.",
        "credit": "NASA / JHU APL / SwRI · gemeinfrei",
        "url": "https://commons.wikimedia.org/wiki/File:Pluto's_Majestic_Mountains,_Frozen_Plains_and_Foggy_Hazes.jpg"
      }
    ]
  }
};
