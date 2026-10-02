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

  /* Missionen: Rätsel, die zu einem Ziel führen.
     brief = so erteilt Flugleiterin Nora die Mission per Funk ({steer} = Steuerung, passend zu Tastatur oder Tablet)
     hint  = ihr Tipp, wenn ein Kind nach einer Weile noch nicht weiterkommt (danach schaltet sie den gelben Pfeil ein) */
  missions: [
    { target: "sonne",   text: "Fliege zu dem Stern, der uns Licht und Wärme schenkt!",
      brief: "Fliege zu dem Stern, der uns Licht und Wärme schenkt! {steer}",
      hint: "Er ist riesig, gelb und leuchtet heller als alles andere – genau in der Mitte des Sonnensystems!" },
    { target: "erde",    text: "Finde unseren Heimatplaneten – den blauen Planeten!",
      brief: "Finde unseren Heimatplaneten – den blauen Planeten! Dort bist du zu Hause.",
      hint: "Er ist der dritte Planet von der Sonne aus: blau und grün, mit einem kleinen grauen Begleiter." },
    { target: "mond",    text: "Besuche den treuen Begleiter der Erde.",
      brief: "Besuche den treuen Begleiter der Erde. Dort waren schon echte Astronauten!",
      hint: "Er ist grau, voller Krater und kreist ganz nah um die Erde. Flieg zur Erde und schau dich dort um!" },
    { target: "mars",    text: "Finde den Roten Planeten.",
      brief: "Finde den Roten Planeten. Unsere Forscherin Mara wartet dort schon auf dich!",
      hint: "Er ist rot wie Rost und kommt direkt nach der Erde – ein Stück weiter weg von der Sonne." },
    { target: "venus",   text: "Finde den heißesten Planeten im Sonnensystem.",
      brief: "Finde den heißesten Planeten im Sonnensystem. Pass auf – dort ist es heißer als in einem Backofen!",
      hint: "Sie hat dicke, gelbliche Wolken und liegt zwischen Merkur und Erde." },
    { target: "merkur",  text: "Welcher Planet ist der Sonne am allernächsten? Fliege hin!",
      brief: "Welcher Planet ist der Sonne am allernächsten? Fliege hin!",
      hint: "Er ist klein, grau und voller Krater – und kreist ganz dicht um die Sonne." },
    { target: "jupiter", text: "Fliege zum größten Planeten – dem Riesen mit dem roten Fleck.",
      brief: "Fliege zum größten Planeten – dem Riesen mit dem roten Fleck. Auf ihm kann man nicht landen, aber deine Sonde schafft das!",
      hint: "Nach dem Mars kommt ein Gürtel aus Felsbrocken – und dahinter der gestreifte Riese." },
    { target: "saturn",  text: "Finde den Planeten mit den schönsten Ringen.",
      brief: "Finde den Planeten mit den schönsten Ringen. Deine Sonde fliegt mitten hindurch!",
      hint: "Achte auf die großen Ringe! Er kommt direkt nach Jupiter." },
    { target: "uranus",  text: "Finde den eisblauen Planeten, der auf der Seite liegt.",
      brief: "Finde den eisblauen Planeten, der auf der Seite liegt. Jetzt wird es richtig kalt!",
      hint: "Er ist türkis und kommt nach Saturn. Flieg weiter nach außen!" },
    { target: "neptun",  text: "Fliege zum stürmischen blauen Planeten ganz außen.",
      brief: "Fliege zum stürmischen blauen Planeten ganz außen. Halt dich fest – dort weht der stärkste Wind!",
      hint: "Er ist tiefblau und der letzte Planet. Flieg ganz weit nach außen, noch hinter Uranus!" },
    { target: "pluto",   text: "Suche den kleinen Zwergplaneten mit dem Herz.",
      brief: "Suche den kleinen Zwergplaneten mit dem Herz. Er liegt ganz am Rand unseres Sonnensystems.",
      hint: "Er ist winzig und liegt noch hinter Neptun – ganz weit draußen." },
    { target: "#order",  text: "Letzte Mission: Bringe alle Planeten in die richtige Reihenfolge!",
      brief: "Letzte Mission: Bringe alle Planeten in die richtige Reihenfolge! Tippe oben rechts auf 🧩 „Ordnen“.",
      hint: "Denk an den Merksatz: Mein Vater erklärt mir jeden Sonntag unsere Nachbarplaneten!" }
  ],

  // Nora: Flugleiterin und Co-Pilotin – fliegt mit in der Rakete und steigt bei jeder Landung mit aus
  nora: { name: "Nora", color: "#06b6d4" },
  // Was Nora im All sagt. {nr} = Nummer der Mission, {ziel} = Himmelskörper („die Erde“), {text} = Missionstext.
  // Aus diesen Sätzen entstehen auch die Sprachaufnahmen (tools/stimmen.js) – nach Änderungen dort neu aufnehmen.
  noraSpace: {
    first: "Ich fliege mit dir, {name}!",
    back: "Willkommen zurück, {name}! Ich bin wieder dabei.",
    done: "Mission geschafft – super, {name}! ⭐ Weiter geht's!",
    allDone: "Du hast ALLE Missionen geschafft, {name}! Hol dir deine Urkunde im Forscherpass 📘 – und flieg, wohin du willst.",
    mission: "Mission {nr}: {text}",
    sight: "Da ist {ziel}! Flieg ganz nah ran und {aktion}.", sightKey: "drück E", sightTouch: "tippe auf „erforschen“",
    other: "Das ist {ziel}. Du kannst hier gern landen!",
    goal: "Unsere Mission: {text}",
    returned: "Zurück im All!",
    notDone: "Dort gibt es noch etwas zu entdecken ({p} von {n}). Lande nochmal – erst dann ist die Mission geschafft!",
    tip: "Kleiner Tipp: {hint}",
    order: "Tippe oben rechts auf 🧩 „Ordnen“ – das schaffst du!",
    arrow: "Ich schalte dir den gelben Pfeil ein – folge ihm einfach!",
    steerKey: "Mit W gibst du Gas, mit A und D lenkst du.", steerTouch: "Links lenkst du, rechts gibst du Gas."
  },

  planetOrder: ["merkur", "venus", "erde", "mars", "jupiter", "saturn", "uranus", "neptun"],
  // Versionsnummer (steht in der Hilfe) – bei jeder Veröffentlichung hochzählen, zusammen mit VERSION in sw.js
  version: "24",

  mnemonic: "Mein Vater erklärt mir jeden Sonntag unsere Nachbarplaneten.",

  /* Aussteigen & erkunden: pro Ort 3 Entdeckungen (eine davon ein großes Spiel), 3 Funk-Fragen, kurze Texte –
     das ganze Spiel soll in 45 bis 60 Minuten zu schaffen sein.
     {name} = Name des Kindes, {rest} = noch offene Entdeckungen */
  surfaces: {
    mond: {
      gravity: 1.62, // m/s² – echte Mond-Schwerkraft (Erde: 9,81); gilt für den Hammer-und-Feder-Versuch
      moveGravity: 2.4, // fürs Laufen und Springen etwas stärker, damit es sich nicht zu zäh anfühlt
      jump: 0.45,       // Sprunghöhe in Metern (mit schwerem Raumanzug)
      // Thermometer am Raumanzug: in der Sonne / im Schatten
      temp: { sun: 120, shade: -150, sunText: "☀️ Sonne – glühend heiß!", shadeText: "❄️ Schatten – eiskalt!" },
      // Nora steigt mit aus der Rakete und führt das Kind (Sprechblase über ihrem Kopf); die Bewohner bleiben vor Ort
      guide: {
        order: ["fallversuch", "apollo", "mondstein"],
        hello: "Da sind wir, {name}! Warte, ich klettere auch runter.",
        welcome: "Willkommen auf dem Mond! Hier wiegst du fast nichts – spring mal! Und dann komm mit.",
        wait: "Hier lang, {name}! Ich warte auf dich.",
        next: "Toll! Komm mit – als Nächstes: {ziel}.",
        arrive: {
          fallversuch: "Was fällt schneller: Hammer oder Feder? Probier es aus!",
          apollo: "Hier sind 1969 die ersten Menschen auf dem Mond gelandet! Stell dich in den Kreis am Seil.",
          mondstein: "Siehst du das Glitzern hinter dem Graben? Nimm Anlauf und spring hinüber!",
          wand: "An der Wand der Mondbasis siehst du alles, was du entdeckt hast.",
          rakete: "Steig über die Leiter ein – ich komme mit!"
        },
        quiz: "Geschafft, {name}! Jetzt noch {fragen} Funk-Fragen – dann fliegen wir weiter.",
        home: "Super gemacht, {name}! Komm, wir gehen zur Rakete.",
        alone: "Alles klar, erkunde allein! Wenn du mich brauchst, komm einfach zu mir.",
        again: "🧭 Nora, zeig mir den Weg"
      },
      // Bewohner der Mondbasis (Ideen von ESA und NASA für eine echte Basis am Südpol des Mondes)
      npcs: [
        { name: "Kommandantin Lea", color: "#3b82f6", path: [[30, 38], [40, 34], [36, 28], [26, 32]],
          hello: "Hallo {name}! Ich bin Lea und leite die Mondbasis.",
          hint: "Warst du schon bei „{ziel}“? Der Pfeil oben zeigt dir den Weg!",
          done: "Du hast alles entdeckt – toll!",
          facts: ["Unsere Kuppeln sind mit Mondstaub bedeckt. Er schützt uns vor Strahlung."] },
        { name: "Ingenieur Tom", color: "#f59e0b", path: [[60, 66], [68, 66]], work: true,
          hello: "Hi {name}, ich bin Tom! Mein großer Drucker baut gerade eine neue Kuppel.",
          hint: "Tipp: Probier mal „{ziel}“ aus!",
          done: "Alles entdeckt? Super!",
          facts: ["Der Drucker baut die Kuppel Schicht für Schicht aus Mondstaub."] }
      ],
      discoveries: [
        { key: "fallversuch", icon: "🪶", title: "Hammer und Feder",
          text: "Beide sind gleichzeitig unten angekommen! Auf der Erde bremst die Luft die leichte Feder. Auf dem Mond gibt es keine Luft – darum fällt alles gleich schnell." },
        { key: "apollo", icon: "👣", title: "Die erste Mondlandung", gallery: ["mond-1.jpg", "mond-2.jpg", "mond-3.jpg"],
          text: "Im Juli 1969 landeten hier Neil Armstrong und Buzz Aldrin – die ersten Menschen auf dem Mond! Ihre Fußabdrücke sind noch heute da, denn auf dem Mond gibt es keinen Wind." },
        { key: "mondstein", icon: "🦘", title: "Der große Mondsprung", photo: "mond.jpg",
          text: "Geschafft! Auf dem Mond springst du 6-mal so hoch und weit wie auf der Erde, denn er zieht nur ein Sechstel so stark. Den Krater hat ein Brocken aus dem All geschlagen." }
      ],
      stations: {
        // action = Knopf an der Station · again = Knopf, um schon Entdecktes nochmal anzusehen · reach = Reichweite in Metern
        // hint = Tipp in der Liste „Meine Entdeckungen“ · small + auto = Fundstück: kleines Licht, Entdeckung beim Hingehen (Meter)
        apollo:      { label: "Landestelle von 1969", hint: "Stell dich in den Kreis am Seil vor der Mondfähre", again: "👣 Nochmal ansehen", auto: true },
        fallversuch: { label: "Hammer & Feder", hint: "Der Tisch mit Hammer und Feder steht neben der Apollo-Landestelle", action: "🪶 Hammer & Feder fallen lassen" },
        mondstein:   { label: "Mondsprung", hint: "Unten im Krater liegt der Mondstein hinter einem Graben – nimm Anlauf und spring!", again: "🦘 Nochmal ansehen", small: true, auto: 2.6 },
        // Tafelwand der Mondstation: keine Entdeckung (info), öffnet die Liste „Meine Entdeckungen“
        wand:        { label: "Wusstest du?", action: "📋 Meine Entdeckungen lesen", info: true, reach: 6.5 },
        rakete:      { label: "Deine Rakete", action: "🚀 Einsteigen", home: true }
      },
      moat: { fell: "Hoppla, in den Graben! Lauf über die flache Rampe raus und nimm mehr Anlauf." },
      // Hammer und Feder: erst vermuten, dann fallen lassen
      fall: { guess: { "q": "Hammer und Feder fallen gleichzeitig los. Was kommt zuerst unten an?", "a": ["Der Hammer", "Die Feder", "Beide gleichzeitig"], "c": 2 } },
      // {anzahl} = Zahl der Entdeckungen, {fragen} = Zahl der Funk-Fragen am Ende
      radio: {
        start: "Hier ist die Bodenstation! Willkommen auf dem Mond, {name}! Hier gibt es {anzahl} Dinge zu entdecken – der Pfeil oben führt dich hin.",
        found: "Klasse! Noch {rest} übrig.",
        back: "Willkommen zurück, {name}! Noch {rest} Entdeckungen – folge dem Pfeil oben.",
        allFound: "Super, {name}! Alles entdeckt. Hier kommen {fragen} Funk-Fragen.",
        tooFar: "Hallo {name}, bitte nicht zu weit weg von der Rakete!",
        quizDone: "Hier hast du schon alles entdeckt, {name}! Lauf zur Rakete, wenn du weiterfliegen willst."
      },
      quiz: [
        { q: "Was passiert, wenn du auf dem Mond genauso kräftig abspringst wie auf der Erde?", a: ["Ich komme genauso hoch", "Ich komme etwa 6-mal so hoch", "Ich fliege ins All davon"], c: 1, why: "Der Mond zieht nur ein Sechstel so stark wie die Erde – darum kommst du 6-mal so hoch." },
        { q: "Was kommt auf dem Mond zuerst unten an?", a: ["Der Hammer", "Die Feder", "Beide gleichzeitig"], c: 2, why: "Ohne Luft bremst nichts die Feder – alles fällt gleich schnell." },
        { q: "Wann waren die ersten Menschen auf dem Mond?", a: ["1869", "1969", "2019"], c: 1, why: "Im Juli 1969 betraten Neil Armstrong und Buzz Aldrin den Mond." }
      ]
    },

    mars: {
      gravity: 3.71, // m/s² – echte Mars-Schwerkraft
      jump: 0.3,
      nasa: ["ingenuity", "perseverance"], // echte NASA-Modelle (werden beim ersten Besuch geladen)
      // Mitbewohner des Forschungslagers: laufen ihre Wege ab und sprechen das Kind an, wenn es nahe kommt
      npcs: [
        { name: "Forscherin Mara", color: "#22c55e", path: [[-12, 50], [-12, 58], [-4, 46], [-16, 44]],
          hello: "Hallo {name}! Ich bin Mara und erforsche den Mars. Schön, dass du da bist!",
          hint: "Warst du schon bei „{ziel}“? Der Pfeil oben zeigt dir den Weg!",
          done: "Wow, du hast alles entdeckt! Du bist ein echter Mars-Profi!",
          facts: ["In unserem Gewächshaus wächst Salat unter Lampen. Draußen würde er sofort erfrieren."] },
        { name: "Techniker Bennett", color: "#3b82f6", path: [[14, 50], [19, 45], [12, 43]], work: true,
          hello: "Hi {name}, ich bin Bennett! Ich kümmere mich um Strom, Luft und Wasser.",
          hint: "Tipp von mir: Probier mal „{ziel}“ aus!",
          done: "Alles entdeckt? Klasse!",
          facts: ["Unseren Strom machen Solarzellen. Nach einem Staubsturm muss ich sie putzen!"] }
      ],
      // Nora steigt mit aus der Rakete und führt das Kind (Sprechblase über ihrem Kopf); die Bewohner bleiben vor Ort
      guide: {
        order: ["abend", "rover", "rost"],
        hello: "Da sind wir, {name}! Warte, ich komme auch runter.",
        welcome: "Willkommen auf dem Mars! Unten im Tal liegt der Außenposten von Mara und Bennett. Komm mit!",
        wait: "Hier lang, {name}! Ich warte auf dich.",
        next: "Klasse! Komm mit – als Nächstes: {ziel}.",
        arrive: {
          abend: "Mit der Himmelskamera spulen wir bis zum Abend vor. Welche Farbe hat wohl der Sonnenuntergang?",
          rover: "Das ist der Rover-Leitstand! Fahr mit dem Rover los und sammle 3 Gesteinsproben.",
          rost: "Im Proben-Labor findest du heraus, warum der Mars rot ist!",
          wand: "An dieser Wand siehst du alles, was du entdeckt hast.",
          rakete: "Steig über die Leiter ein – ich komme mit. Tschüss, Mars!"
        },
        quiz: "Geschafft, {name}! Jetzt noch {fragen} Funk-Fragen – dann fliegen wir weiter.",
        home: "Super gemacht, {name}! Komm, wir gehen zur Rakete.",
        alone: "Alles klar, erkunde allein! Wenn du mich brauchst, komm einfach zu mir.",
        again: "🧭 Nora, zeig mir den Weg"
      },
      temp: { sun: -50, shade: -75, sunText: "☀️ Sonne – trotzdem eiskalt!", shadeText: "❄️ Schatten – noch kälter!" },
      discoveries: [
        { key: "abend", icon: "🌇", title: "Blauer Sonnenuntergang",
          text: "Auf dem Mars ist der Sonnenuntergang blau! Bei uns ist es umgekehrt: Am Tag ist der Himmel blau, am Abend rot. Das macht der feine Staub in der Marsluft." },
        { key: "rover", icon: "🤖", title: "Rover auf Spurensuche", gallery: ["mars-1.jpg", "mars-2.jpg"],
          text: "Kügelchen und Steine mit Schichten: Hier gab es vor langer Zeit Wasser! So etwas hat der echte Rover Opportunity gefunden. Und Staubteufel haben ihm oft die Solarzellen sauber gepustet." },
        { key: "rost", icon: "🧲", title: "Rost im Marsstaub",
          text: "Der Staub bleibt am Magneten hängen – in ihm steckt Eisen! Das Eisen ist verrostet, und Rost ist rotbraun. Darum ist der ganze Mars rot." }
      ],
      stations: {
        wand:      { label: "Wusstest du?", action: "📋 Meine Entdeckungen lesen", info: true, reach: 6.5 },
        rover:     { label: "Rover-Expedition", hint: "Am Rover-Leitstand unten im Tal startet die Rover-Expedition", action: "🤖 Rover-Expedition starten" },
        rost:      { label: "Proben-Labor", hint: "Untersuch den Marsstaub im Proben-Labor am Labor-Turm", action: "🧲 Magnet-Versuch starten" },
        abend:     { label: "Wetterstation", hint: "An der Wetterstation auf der Hochebene steht eine Himmelskamera", action: "⏩ Zeit vorspulen bis zum Abend" },
        rakete:    { label: "Deine Rakete", action: "🚀 Einsteigen", home: true }
      },
      // Rover-Expedition: 3 Proben im alten Flussdelta sammeln; Staub macht die Solarzellen dunkel – ein Staubteufel pustet sie sauber
      rover: {
        start: "Rover-Expedition! Fahr zu den 3 gelben Zielen im alten Flussdelta und nimm Proben. Achte auf die Batterie!",
        keys: "Fahren: W, A, S, D",
        keysTouch: "Fahren: Joystick",
        label: "🔋 Batterie", samples: "🪨 Proben: {n} von 3",
        sample: [
          "Kleine runde Kügelchen! Forscher nennen sie „Blaubeeren“ – sie entstehen nur im Wasser.",
          "Ein Stein mit Schichten! So etwas entsteht am Grund von Seen. Hier war ein See!",
          "Diese Probe kommt in ein Röhrchen. Eines Tages bringt eine Rakete sie zur Erde!"
        ],
        dusty: "Oh nein, Staub auf den Solarzellen – die Batterie wird schwach! Fahr in den Staubteufel, er pustet sie sauber!",
        clean: "Saubergepustet! Die Batterie lädt wieder.",
        empty: "Batterie leer! Der Rover lädt in der Sonne – einen Moment …",
        far: "Zu weit weg – hier reicht der Funk nicht. Fahr zurück!",
        done: "Alle 3 Proben gesammelt!",
        doneBtn: "Was hat der Rover entdeckt? ▶"
      },
      magnet: {
        guess: { "q": "Bleibt der rote Marsstaub am Magneten hängen?", "a": ["Ja", "Nein"], "c": 0 },
        ready: "In der Schale liegt Marsstaub. Halte einen Magneten hinein!",
        go: "🧲 Magnet in den Staub halten",
        running: "Der Magnet senkt sich in den Staub …",
        end: "Der Staub klebt am Magneten: Im Marsstaub steckt Eisen – verrostetes Eisen!",
        again: "🧲 Nochmal", done: "Fertig ✓"
      },
      dusk: {
        guess: { "q": "Welche Farbe hat wohl der Sonnenuntergang auf dem Mars?", "a": ["Rot-orange wie bei uns", "Blau", "Grün"], "c": 1 },
        ready: "Am Tag ist der Marshimmel gelbbraun vom Staub. Jetzt spulen wir bis zum Abend vor.",
        running: "Die Sonne sinkt …",
        end: "Der Sonnenuntergang auf dem Mars ist blau! Bei uns ist es genau umgekehrt.",
        again: "⏩ Nochmal", done: "Fertig ✓"
      },
      radio: {
        start: "Hier ist die Bodenstation! Willkommen auf dem Mars, {name}! Hier gibt es {anzahl} Dinge zu entdecken – der Pfeil oben führt dich hin.",
        found: "Klasse! Noch {rest} übrig.",
        back: "Willkommen zurück, {name}! Noch {rest} Entdeckungen – folge dem Pfeil oben.",
        allFound: "Super, {name}! Alles entdeckt. Hier kommen {fragen} Funk-Fragen.",
        tooFar: "Hallo {name}, bitte nicht zu weit weg von der Rakete!",
        quizDone: "Hier hast du schon alles entdeckt, {name}! Lauf zur Rakete, wenn du weiterfliegen willst."
      },
      quiz: [
        { q: "Warum ist der Mars rot?", a: ["Weil er so heiß ist", "Wegen Rost im Staub", "Wegen roter Pflanzen"], c: 1, why: "Im Marsstaub steckt verrostetes Eisen – und Rost ist rotbraun." },
        { q: "Welche Farbe hat der Sonnenuntergang auf dem Mars?", a: ["Rot", "Blau", "Grün"], c: 1, why: "Der feine Staub in der dünnen Marsluft lässt den Himmel um die Abendsonne blau leuchten." },
        { q: "Was hat dein Rover entdeckt?", a: ["Spuren von altem Wasser", "Einen Marsmenschen", "Einen Goldschatz"], c: 0, why: "Die Kügelchen und die Schichten im Stein zeigen: Früher gab es auf dem Mars Wasser." }
      ]
    },

    merkur: {
      gravity: 3.7, jump: 0.3,
      temp: { sun: 430, shade: -180, sunText: "☀️ Sonne – heißer als ein Backofen!", shadeText: "❄️ Schatten – eiskalt!" },
      // Nora steigt mit aus der Rakete und führt das Kind (Sprechblase über ihrem Kopf); die Bewohner bleiben vor Ort
      guide: {
        order: ["temperatur", "sonne", "krater"],
        hello: "Da sind wir, {name}! Schnell aus der Sonne – ich komme!",
        welcome: "Willkommen auf dem Merkur! In der Sonne ist es hier heißer als in einem Backofen. Komm mit!",
        wait: "Hier lang, {name}! Ich warte auf dich.",
        next: "Klasse! Weiter geht's – als Nächstes: {ziel}.",
        arrive: {
          temperatur: "Hier startet der Schattenlauf! Lauf von Schatten zu Schatten bis zum großen Felsen.",
          sonne: "Oben auf dem Sonnenturm steht ein Fernrohr mit Filter. Schau, wie riesig die Sonne hier ist!",
          krater: "Lass einen Brocken aus dem All fallen und schau, was passiert!",
          wand: "An der Wand der Station siehst du alles, was du entdeckt hast.",
          rakete: "Steig über die Leiter ein – ich komme mit. Raus aus der Hitze!"
        },
        quiz: "Geschafft, {name}! Jetzt noch {fragen} Funk-Fragen – dann fliegen wir weiter.",
        home: "Super gemacht, {name}! Komm, wir gehen zur Rakete.",
        alone: "Alles klar, erkunde allein! Wenn du mich brauchst, komm einfach zu mir.",
        again: "🧭 Nora, zeig mir den Weg"
      },
      npcs: [
        { name: "Forscher Kofi", color: "#b45309", path: [[-6, 58], [6, 56], [2, 52]],
          hello: "Hallo {name}! Ich bin Kofi. Gut, dass du einen Raumanzug trägst!",
          hint: "Warst du schon bei „{ziel}“? Der Pfeil oben zeigt dir den Weg!",
          done: "Du hast alles entdeckt! Jetzt weißt du mehr über den Merkur als fast alle Menschen.",
          facts: ["Unsere Station steht unten im Krater. Der Kraterrand wirft seinen Schatten auf uns."] }
      ],
      discoveries: [
        { key: "temperatur", icon: "🌡️", title: "Backofen und Eisschrank",
          text: "Geschafft! In der Sonne wird es auf dem Merkur 430 °C heiß, im Schatten −180 °C. Es gibt keine Luft, die die Wärme verteilt." },
        { key: "sonne", icon: "☀️", title: "Die riesige Sonne",
          text: "Vom Merkur aus sieht die Sonne fast dreimal so breit aus wie bei uns! Kein Planet ist ihr näher. Schau aber niemals ohne Filter in die Sonne!" },
        { key: "krater", icon: "☄️", title: "Einschlag!", photo: "merkur-1.jpg",
          text: "Der Brocken ist eingeschlagen, ohne zu verglühen! Der Merkur hat keine Luft, die ihn bremst. Darum ist er voller Krater – wie unser Mond." }
      ],
      stations: {
        wand:       { label: "Wusstest du?", action: "📋 Meine Entdeckungen lesen", info: true, reach: 6.5 },
        temperatur: { label: "Schattenlauf", hint: "Der Schattenlauf startet neben dem Sonnenturm – lauf von Schatten zu Schatten bis zum großen Felsen", action: "☀️ Schattenlauf starten" },
        sonne:      { label: "Sonnenturm", hint: "Oben auf dem Sonnenturm steht ein Fernrohr mit Sonnenfilter", action: "🔭 Durchschauen" },
        krater:     { label: "Einschlag-Messfeld", hint: "Probier den Einschlag-Versuch am Messpult aus", action: "☄️ Einschlag-Versuch starten" },
        rakete:     { label: "Deine Rakete", action: "🚀 Einsteigen", home: true }
      },
      shadowRun: {
        start: "Los! Lauf von Schatten zu Schatten bis in den goldenen Kreis. In der Sonne wird dein Anzug heiß – im Schatten kühlt er ab!",
        label: "🧑‍🚀 Anzug-Hitze", sun: "☀️ Sonne: 430 °C – schnell in den Schatten!", cool: "❄️ Schatten: Anzug kühlt ab",
        hot: "Puh, zu heiß! Zurück zum Start. Bleib nicht so lange in der Sonne!",
        quit: "Schattenlauf abgebrochen. Am Start kannst du neu beginnen."
      },
      sunScope: {
        aim: "Dieses Fernrohr hat einen Sonnenfilter. Such die Sonne! Zieh mit der Maus oder nimm die Pfeiltasten.",
        aimTouch: "Dieses Fernrohr hat einen Sonnenfilter. Such die Sonne! Wische über den Himmel, um es zu schwenken.",
        hint: "Tipp: Die Sonne ist in dieser Richtung",
        almost: "Fast! Halte das Fernrohr genau auf die Sonne.",
        found: "Das ist die Sonne durch den Filter. Die dunklen Punkte sind Sonnenflecken!",
        compareBtn: "☀️ Und von der Erde aus?",
        compare: "Die kleine Scheibe: So sehen wir die Sonne von der Erde. Vom Merkur aus ist sie fast dreimal so breit!",
        done: "Fertig ✓"
      },
      impact: {
        guess: { "q": "Der Merkur hat keine Luft. Was passiert mit dem Brocken?", "a": ["Er verglüht wie eine Sternschnuppe", "Er schlägt ein und macht einen Krater"], "c": 1 },
        ready: "Auf der Erde verglühen solche Brocken meist in der Luft – als Sternschnuppen.",
        go: "☄️ Brocken fallen lassen",
        running: "Achtung, er kommt …",
        end: "Eingeschlagen – ohne zu verglühen! So sind die Krater auf dem Merkur entstanden.",
        again: "☄️ Nochmal", done: "Fertig ✓"
      },
      radio: {
        start: "Hier ist die Bodenstation! Willkommen auf dem Merkur, {name}! Hier gibt es {anzahl} Dinge zu entdecken – der Pfeil oben führt dich hin.",
        found: "Klasse! Noch {rest} übrig.",
        back: "Willkommen zurück, {name}! Noch {rest} Entdeckungen – folge dem Pfeil oben.",
        allFound: "Super, {name}! Alles entdeckt. Hier kommen {fragen} Funk-Fragen.",
        tooFar: "Hallo {name}, bitte nicht zu weit weg von der Rakete!",
        quizDone: "Hier hast du schon alles entdeckt, {name}! Lauf zur Rakete, wenn du weiterfliegen willst."
      },
      quiz: [
        { q: "Warum verglühen Brocken aus dem All auf dem Merkur nicht?", a: ["Weil es dort keine Luft gibt", "Weil es dort zu kalt ist", "Weil sie zu klein sind"], c: 0, why: "Ohne Luft bremst und erhitzt nichts die Brocken – sie schlagen ein und hinterlassen Krater." },
        { q: "Warum ist es auf dem Merkur in der Sonne glühend heiß und im Schatten eiskalt?", a: ["Weil keine Luft die Wärme verteilt", "Weil er sich so schnell dreht", "Weil dort Eis liegt"], c: 0, why: "Ohne Luft wird die Wärme nicht verteilt: In der Sonne sind es 430 °C, im Schatten −180 °C." },
        { q: "Wie sieht die Sonne vom Merkur aus?", a: ["Kleiner als bei uns", "Genauso groß wie bei uns", "Fast dreimal so breit"], c: 2, why: "Der Merkur ist der Sonne am nächsten – darum sieht sie dort riesig aus." }
      ]
    },

    pluto: {
      gravity: 0.62, // m/s² – echte Schwerkraft auf Pluto
      moveGravity: 1.2, // fürs Laufen und Springen stärker, sonst schwebt man ewig
      jump: 1.6,
      temp: { sun: -228, shade: -233, sunText: "☀️ Sonne – sie wärmt kaum!", shadeText: "❄️ Schatten – eisig!" },
      // Nora steigt mit aus der Rakete und führt das Kind (Sprechblase über ihrem Kopf); die Bewohner bleiben vor Ort
      guide: {
        order: ["herz", "eis", "funk"],
        hello: "Da sind wir – am Rand des Sonnensystems! Warte, ich komme.",
        welcome: "Brr, {name}! Auf Pluto ist es so kalt, dass sogar die Luft gefriert. Spring mal – hier fliegst du richtig hoch! Und dann komm mit.",
        wait: "Hier lang, {name}! Ich warte auf dich.",
        next: "Toll! Weiter geht's – als Nächstes: {ziel}.",
        arrive: {
          herz: "Hier startet eine Kameradrohne. Flieg hoch und schau dir die Eisfläche von oben an!",
          eis: "Auf dem glatten Eis rutscht alles ewig weit. Spiel eine Runde Eis-Curling!",
          funk: "Mit der großen Antenne funkt die Station zur Erde. Schick einen Funkspruch – wie lange braucht er wohl?",
          wand: "An der Wand der Station siehst du alles, was du entdeckt hast.",
          rakete: "Steig ein – ich komme mit. Der Weg nach Hause ist lang!"
        },
        quiz: "Geschafft, {name}! Jetzt noch {fragen} Funk-Fragen – dann fliegen wir weiter.",
        home: "Super gemacht, {name}! Komm, wir gehen zur Rakete.",
        alone: "Alles klar, erkunde allein! Wenn du mich brauchst, komm einfach zu mir.",
        again: "🧭 Nora, zeig mir den Weg"
      },
      npcs: [
        { name: "Forscherin Yuki", color: "#8b5cf6", path: [[-40, 44], [-30, 44], [-34, 38]],
          hello: "Hallo {name}! Ich bin Yuki. Willkommen am kältesten Ort, den du je besucht hast!",
          hint: "Warst du schon bei „{ziel}“? Der Pfeil oben zeigt dir den Weg!",
          done: "Du hast alles entdeckt – bis zum Rand des Sonnensystems! Toll gemacht.",
          facts: ["Die Berge da hinten sind aus Wassereis. Bei −230 °C ist Eis so hart wie Stein."] }
      ],
      discoveries: [
        { key: "herz", icon: "🤍", title: "Das Herz von Pluto", photo: "pluto.jpg",
          text: "Von oben siehst du es: ein riesiges Herz aus Eis, über 1.000 Kilometer breit! Die Raumsonde New Horizons hat es 2015 entdeckt." },
        { key: "eis", icon: "🥌", title: "Rutschpartie auf Stickstoff-Eis",
          text: "Der Stein rutscht und rutscht! Das Herz ist aus gefrorenem Stickstoff – bei uns ein Gas in der Luft. Bei −230 °C wird er zu spiegelglattem Eis." },
        { key: "funk", icon: "📡", title: "Unendlich weit weg",
          text: "Dein Funkspruch braucht 5½ Stunden bis zur Erde – obwohl er so schnell ist wie Licht! Pluto ist 5,9 Milliarden Kilometer von der Sonne entfernt." }
      ],
      stations: {
        wand:      { label: "Wusstest du?", action: "📋 Meine Entdeckungen lesen", info: true, reach: 6.5 },
        herz:      { label: "Drohnen-Start", hint: "Steig am Drohnen-Landeplatz mit der Kameradrohne auf", action: "🚁 Mit der Drohne aufsteigen" },
        funk:      { label: "Große Antenne", hint: "Schick an der großen Antenne einen Funkspruch zur Erde", action: "📡 Funkspruch zur Erde schicken" },
        eis:       { label: "Eis-Curling", hint: "Auf dem glatten Eis des Herzens wartet ein Eis-Curling-Spiel", action: "🥌 Eis-Curling spielen" },
        rakete:    { label: "Deine Rakete", action: "🚀 Einsteigen", home: true }
      },
      curling: {
        aim: "Eis-Curling! Ziel mit ⬅️ ➡️ (oder A und D) auf die Zielscheibe.",
        aimTouch: "Eis-Curling! Ziel mit dem Joystick auf die Zielscheibe.",
        aimBtn: "🎯 Richtung passt!",
        power: "Der Pfeil zeigt den Schwung: grün = sanft, rot = kräftig. Drück im richtigen Moment!",
        throwBtn: "🥌 Jetzt schieben!",
        slide: "Der Stein rutscht und rutscht … auf Stickstoff-Eis bremst fast nichts!",
        r3: "🎯 Volltreffer – mitten im Ziel!", r2: "Super, im Ziel!", r1: "Knapp – aber im Ziel!",
        short: "Zu kurz – gib etwas mehr Schwung!", long: "Zu weit! Das Eis ist so glatt, dass weniger Schwung reicht.",
        fact: "Bei −230 °C gefriert sogar Stickstoff zu spiegelglattem Eis.",
        again: "🥌 Nochmal werfen (noch {n})", done: "Fertig ✓", quit: "Später"
      },
      drone: {
        rising: "Die Kameradrohne steigt auf … Schau dir die helle Fläche dort hinten an!",
        top: "Siehst du es? Die helle Eisfläche hat die Form eines Herzens!",
        done: "Landen ✓"
      },
      signal: {
        guess: { "q": "Wie lange braucht ein Funkspruch von Pluto bis zur Erde?", "a": ["1 Sekunde", "8 Minuten", "5½ Stunden"], "c": 2 },
        ready: "Wir funken zur Erde: „Hallo von Pluto!“ Achtung …",
        run: "Der Funkspruch fliegt so schnell wie Licht … unterwegs seit",
        end: "Angekommen – nach 5½ Stunden! Und die Antwort braucht noch einmal so lange.",
        again: "📡 Nochmal", done: "Fertig ✓"
      },
      radio: {
        start: "Hier ist die Bodenstation! Willkommen auf Pluto, {name}! Hier gibt es {anzahl} Dinge zu entdecken – der Pfeil oben führt dich hin.",
        found: "Klasse! Noch {rest} übrig.",
        back: "Willkommen zurück, {name}! Noch {rest} Entdeckungen – folge dem Pfeil oben.",
        allFound: "Super, {name}! Alles entdeckt. Hier kommen {fragen} Funk-Fragen.",
        tooFar: "Hallo {name}, bitte nicht zu weit weg von der Rakete!",
        quizDone: "Hier hast du schon alles entdeckt, {name}! Lauf zur Rakete, wenn du weiterfliegen willst."
      },
      quiz: [
        { q: "Welche Form hat die große Eisfläche auf Pluto?", a: ["Ein Stern", "Ein Herz", "Ein Quadrat"], c: 1, why: "Die riesige Eisfläche sieht aus wie ein Herz – entdeckt 2015 von der Sonde New Horizons." },
        { q: "Warum rutschst du auf Plutos Herz?", a: ["Es ist glattes Eis aus gefrorenem Stickstoff", "Es ist nasser Schlamm", "Es ist poliertes Metall"], c: 0, why: "Bei −230 °C gefriert sogar Stickstoff – das Gas aus unserer Luft – zu glattem Eis." },
        { q: "Wie lange braucht ein Funkspruch von Pluto bis zur Erde?", a: ["1 Sekunde", "8 Minuten", "5½ Stunden"], c: 2, why: "Pluto ist 5,9 Milliarden Kilometer entfernt – selbst Licht braucht dafür Stunden." }
      ]
    },

    venus: {
      gravity: 8.87, jump: 0.13,
      temp: { sun: 465, shade: 465, sunText: "🔥 Überall glühend heiß!", shadeText: "🔥 Auch im Schatten glühend heiß!" },
      // Sara wohnt im Luftschiff oben in den Wolken und ist mit herabgekommen
      npcs: [
        { name: "Pilotin Sara", color: "#f97316", path: [[-20, 64], [-8, 64], [-14, 60]],
          hello: "Hallo {name}! Ich bin Sara und fliege das Luftschiff oben in den Wolken.",
          hint: "Warst du schon bei „{ziel}“? Folge den Leitlichtern!",
          done: "Du hast alles entdeckt! Jetzt kennst du den heißesten Planeten.",
          facts: ["Wir wohnen im Luftschiff, 50 Kilometer hoch in den Wolken. Dort ist es angenehm warm."] }
      ],
      // Nora steigt mit aus der Rakete und führt das Kind (Sprechblase über ihrem Kopf); die Bewohner bleiben vor Ort
      guide: {
        order: ["venera", "hitze", "druck"],
        hello: "Da sind wir, {name}! Man sieht kaum etwas im Dunst – bleib stehen, ich komme!",
        welcome: "Willkommen auf der Venus! Zum Glück tragen wir Spezialanzüge. Komm mit!",
        wait: "Hier lang, {name}! Folge den Lichtern zu mir.",
        next: "Gut gemacht! Weiter an den Leitlichtern entlang – als Nächstes: {ziel}.",
        arrive: {
          venera: "Irgendwo im Dunst steht eine alte Landesonde: Venera 13. Such sie mit dem Radar – bevor die Kühlung deines Anzugs leer ist!",
          hitze: "Das ist der Klima-Messturm. Was passiert wohl, wenn wir die Wolken wegschieben?",
          druck: "Am Druck-Prüfstand siehst du, wie stark die Venusluft drückt. Gleich knirscht es!",
          wand: "Das ist der Außenposten. An der Wand siehst du alles, was du entdeckt hast.",
          rakete: "Steig ein – ich komme mit. Raus aus der Hitze!"
        },
        quiz: "Geschafft, {name}! Jetzt noch {fragen} Funk-Fragen – dann fliegen wir weiter.",
        home: "Super gemacht, {name}! Komm, wir gehen zur Rakete.",
        alone: "Alles klar, erkunde allein! Folge einfach den Leitlichtern. Wenn du mich brauchst, komm zu mir.",
        again: "🧭 Nora, zeig mir den Weg"
      },
      discoveries: [
        { key: "venera", icon: "🛰️", title: "Venera 13 gefunden!", photo: "venus-1.jpg",
          text: "Diese Sonde landete 1982 auf der Venus und funkte dieses Foto zur Erde – es zeigt wirklich den Boden der Venus! Nach 2 Stunden gab sie auf: Es war zu heiß." },
        { key: "hitze", icon: "🌡️", title: "Der heißeste Planet",
          text: "Auf der Venus ist es 465 °C heiß – heißer als auf dem Merkur! Die dicken Wolken halten die Wärme fest wie eine Decke." },
        { key: "druck", icon: "🥫", title: "Zerquetscht!",
          text: "Die Venusluft drückt 90-mal so stark wie unsere Luft. Ohne Spezialanzug ginge es dir wie der Dose!" }
      ],
      stations: {
        wand:       { label: "Wusstest du?", action: "📋 Meine Entdeckungen lesen", info: true, reach: 6.5 },
        venera:     { label: "Radar-Suche", hint: "Am Radar-Peiler neben deiner Rakete startet die Suche nach der Sonde Venera 13", action: "📡 Radar-Suche starten" },
        hitze:      { label: "Klima-Messturm", hint: "Probier den Wolken-Versuch am Klima-Messturm aus", action: "☁️ Wolken-Versuch starten" },
        druck:      { label: "Druck-Prüfstand", hint: "Probier den Druck-Versuch am Druck-Prüfstand aus", action: "🥫 Druck-Versuch starten" },
        rakete:     { label: "Deine Rakete", action: "🚀 Einsteigen", home: true }
      },
      // Radar-Suche: Venera 13 im dichten Dunst finden, bevor die Anzug-Kühlung leer ist
      radar: {
        start: "Das Radar piept schneller, je näher du der Sonde kommst. Such Venera 13 im Dunst!",
        label: "📡 Radar-Signal", cool: "❄️ Anzug-Kühlung: {n} %",
        warmer: "📡 Wärmer! Das Signal wird stärker.", colder: "📡 Kälter … das Signal wird schwächer.",
        hint: "Tipp: Das Signal kommt von {dir}!",
        dirs: ["vorne", "rechts vorne", "rechts", "rechts hinten", "hinten", "links hinten", "links", "links vorne"],
        hot: "Die Kühlung ist leer! Zurück zum Radar-Peiler – dort wird dein Anzug wieder kalt.",
        found: "Da ist sie: Venera 13!",
        quit: "Radar-Suche abgebrochen. Am Radar-Peiler kannst du neu starten."
      },
      heat: {
        guess: { "q": "Was passiert, wenn wir die Wolken wegschieben?", "a": ["Es wird noch heißer", "Es wird kühler"], "c": 1 },
        intro: "465 °C – heißer als jeder Backofen, sogar im Schatten! Schuld ist die dicke Wolkendecke.",
        off: "☁️ Wolken wegschieben", on: "☁️ Wolken zurückholen",
        offText: "Ohne Wolken entweicht die Wärme ins All. Schau aufs Thermometer – es wird viel kühler!",
        onText: "Mit Wolken kommt die Wärme nicht mehr hinaus – wie unter einer dicken Decke.",
        done: "Fertig ✓"
      },
      press: {
        guess: { "q": "Was passiert mit der Blechdose, wenn die Glocke aufgeht?", "a": ["Nichts", "Sie wird zerquetscht", "Sie fliegt davon"], "c": 1 },
        ready: "Unter der Glocke steht eine Blechdose. Gleich öffnen wir die Glocke.",
        go: "🔔 Glocke öffnen",
        running: "Die Glocke hebt sich …",
        end: "Zerquetscht! Die Venusluft drückt 90-mal so stark wie unsere Luft.",
        again: "🔔 Nochmal", done: "Fertig ✓"
      },
      radio: {
        start: "Hier ist die Bodenstation! Willkommen auf der Venus, {name}! Dein Spezialanzug schützt dich. Hier gibt es {anzahl} Dinge zu entdecken – folge dem Pfeil oben.",
        found: "Klasse! Noch {rest} übrig.",
        back: "Willkommen zurück, {name}! Noch {rest} Entdeckungen – folge dem Pfeil oben.",
        allFound: "Super, {name}! Alles entdeckt. Hier kommen {fragen} Funk-Fragen.",
        tooFar: "Hallo {name}, bitte nicht zu weit weg von der Rakete!",
        quizDone: "Hier hast du schon alles entdeckt, {name}! Lauf zur Rakete, wenn du weiterfliegen willst."
      },
      quiz: [
        { q: "Warum ist es auf der Venus so heiß?", a: ["Weil sie der Sonne am nächsten ist", "Weil die dicken Wolken die Wärme festhalten", "Weil sie innen brennt"], c: 1, why: "Die Wolken wirken wie eine dicke Decke – die Wärme kommt nicht mehr hinaus." },
        { q: "Was ist mit der Blechdose passiert?", a: ["Sie ist geschmolzen", "Sie ist davongeflogen", "Die dichte Luft hat sie zerquetscht"], c: 2, why: "Die Venusluft drückt 90-mal so stark wie die Luft auf der Erde." },
        { q: "Wie lange hielt die Sonde Venera 13 auf der Venus durch?", a: ["Etwa 2 Stunden", "2 Jahre", "Bis heute"], c: 0, why: "Nach etwa 2 Stunden gab sie auf – die Hitze und der Druck waren zu stark." }
      ]
    },

    erde: {
      gravity: 9.81, jump: 0.11,
      temp: { sun: 22, shade: 15, sunText: "☀️ Sonne – angenehm warm!", shadeText: "🌳 Schatten – schön kühl!" },
      // Jana arbeitet im Besucherzentrum und trainiert selbst für einen Flug ins All – darum trägt sie einen Trainingsanzug
      npcs: [
        { name: "Astronautin Jana", color: "#2563eb", path: [[-6, 74], [8, 74], [2, 70]],
          hello: "Hallo {name}! Ich bin Jana und trainiere hier für meinen ersten Flug ins All.",
          hint: "Warst du schon bei „{ziel}“? Folge dem Weg um den See!",
          done: "Du hast alles entdeckt! Siehst du jetzt, wie besonders unsere Erde ist?",
          facts: ["Das Training für einen Flug ins All dauert mehrere Jahre!"] }
      ],
      // Nora steigt mit aus der Rakete und führt das Kind (Sprechblase über ihrem Kopf); die Bewohner bleiben vor Ort
      guide: {
        order: ["wald", "tag", "luft"],
        hello: "Da sind wir, {name} – zu Hause! Warte, ich komme.",
        welcome: "Willkommen auf der Erde! Heute siehst du, wie besonders unser Planet ist. Komm mit!",
        wait: "Hier lang, {name}! Ich warte auf dich.",
        next: "Prima! Weiter auf dem Rundweg – als Nächstes: {ziel}.",
        arrive: {
          wald: "Im Wald und am See leben viele Tiere und Pflanzen. Fotografiere 5 verschiedene Lebewesen!",
          tag: "An der Sonnenuhr spulen wir einen ganzen Tag vor.",
          luft: "Was wäre, wenn die Erde keine Luft hätte? Probier es aus!",
          wand: "Im Besucherzentrum siehst du an der Wand alles, was du entdeckt hast.",
          rakete: "Steig ein – ich komme mit. Auf zu neuen Welten!"
        },
        quiz: "Geschafft, {name}! Jetzt noch {fragen} Funk-Fragen – dann fliegen wir weiter.",
        home: "Super gemacht, {name}! Komm, wir gehen zur Rakete.",
        alone: "Alles klar, erkunde allein! Wenn du mich brauchst, komm einfach zu mir.",
        again: "🧭 Nora, zeig mir den Weg"
      },
      discoveries: [
        { key: "wald", icon: "🌳", title: "Leben!",
          text: "Du hast 5 Lebewesen fotografiert! Pflanzen, Tiere und Menschen – das alles ist Leben. Das gibt es nur hier, weil die Erde Wasser, Luft und die richtige Wärme hat." },
        { key: "tag", icon: "🌗", title: "Tag und Nacht",
          text: "Ein ganzer Tag: 24 Stunden. Dabei wandert gar nicht die Sonne – die Erde dreht sich einmal um sich selbst!" },
        { key: "luft", icon: "🌬️", title: "Unser Schutzschild",
          text: "Die Luft macht den Himmel blau, hält die Erde warm und schützt uns. Und wir können sie atmen! Nirgendwo sonst ginge das ohne Raumanzug." }
      ],
      stations: {
        wand:      { label: "Wusstest du?", action: "📋 Meine Entdeckungen lesen", info: true, reach: 6.5 },
        luft:      { label: "Wetterstation", hint: "Probier an der Wetterstation den Luft-Versuch aus", action: "🌬️ Luft-Versuch starten" },
        tag:       { label: "Sonnenuhr im Park", hint: "Spul im Park an der Sonnenuhr die Zeit vor", action: "⏩ Einen Tag vorspulen" },
        wald:      { label: "Foto-Safari", hint: "Am Waldrand startet die Foto-Safari: Fotografiere 5 verschiedene Lebewesen", action: "📷 Foto-Safari starten" },
        rakete:    { label: "Deine Rakete", action: "🚀 Einsteigen", home: true }
      },
      // Foto-Safari: 5 verschiedene Lebewesen fotografieren (Pflanzen, Tiere und Menschen)
      safari: {
        start: "Foto-Safari! Finde 5 verschiedene Lebewesen. Halte sie in die Bildmitte und mach ein Foto!",
        btn: "📷 Foto machen",
        label: "📷 Lebewesen: {n} von 5",
        none: "Kein Lebewesen im Bild – geh näher heran und halte es in die Mitte!",
        blocked: "Da ist etwas im Weg – geh ein Stück zur Seite!",
        tip: "Tipp: Auf dem See schwimmen Enten, am Waldrand grasen Rehe, und auf der Wiese blühen Blumen!",
        twice: "{name} hast du schon! Such ein anderes Lebewesen.",
        kinds: {
          ente: ["🦆", "Ente"], baum: ["🌳", "Baum"], reh: ["🦌", "Reh"], schmetterling: ["🦋", "Schmetterling"],
          blume: ["🌻", "Blume"], frosch: ["🐸", "Frosch"], vogel: ["🐦", "Vogel"], mensch: ["🧑", "Mensch"]
        },
        says: {
          ente: "Eine Ente! Sie schwimmt auf dem Wasser.", baum: "Ein Baum – auch Pflanzen sind Lebewesen!", reh: "Ein Reh! Psst, nicht erschrecken.",
          schmetterling: "Ein Schmetterling! Er trinkt Nektar aus den Blüten.", blume: "Eine Blume – sie wächst im Licht der Sonne.",
          frosch: "Ein Frosch! Er lebt am Wasser.", vogel: "Ein Vogel! Er braucht die Luft zum Fliegen.", mensch: "Ein Mensch! Auch wir Menschen sind Lebewesen."
        }
      },
      air: {
        guess: { "q": "Was passiert mit dem Himmel, wenn die Luft weg ist?", "a": ["Er bleibt blau", "Er wird schwarz", "Er wird rot"], "c": 1 },
        intro: "Gleich nehmen wir der Erde einfach die Luft weg!",
        off: "🚫 Luft wegnehmen", on: "🌬️ Luft zurückholen",
        offText: "Ohne Luft ist der Himmel schwarz wie auf dem Mond – und atmen könnte hier niemand.",
        onText: "Mit Luft ist der Himmel blau. Die Luft schützt uns wie ein Schild.",
        done: "Fertig ✓"
      },
      day: {
        guess: { "q": "Was passiert eigentlich an einem Tag?", "a": ["Die Sonne wandert um die Erde", "Die Erde dreht sich um sich selbst"], "c": 1 },
        ready: "Die Sonnenuhr zeigt mit ihrem Schatten die Zeit. Wir spulen einen ganzen Tag vor!",
        day: "{uhr} Uhr: Es ist Tag. Die Sonne wandert über den Himmel.",
        night: "{uhr} Uhr: Es ist Nacht. Jetzt sieht man die Sterne!",
        end: "24 Stunden sind vorbei! Nicht die Sonne wandert – die Erde dreht sich einmal um sich selbst.",
        again: "⏩ Nochmal", done: "Fertig ✓"
      },
      radio: {
        start: "Hier ist die Bodenstation! Willkommen zu Hause, {name}! Auch hier gibt es {anzahl} Dinge zu entdecken – der Pfeil oben führt dich hin.",
        found: "Klasse! Noch {rest} übrig.",
        back: "Willkommen zurück, {name}! Noch {rest} Entdeckungen – folge dem Pfeil oben.",
        allFound: "Super, {name}! Alles entdeckt. Hier kommen {fragen} Funk-Fragen.",
        tooFar: "Hallo {name}, bitte nicht zu weit weg von der Rakete!",
        quizDone: "Hier hast du schon alles entdeckt, {name}! Lauf zur Rakete, wenn du weiterfliegen willst."
      },
      quiz: [
        { q: "Was gibt es nur auf der Erde?", a: ["Krater", "Flüssiges Wasser und Leben", "Berge"], c: 1, why: "Seen, Meere und Lebewesen kennen wir nur von der Erde." },
        { q: "Wodurch entstehen Tag und Nacht?", a: ["Die Sonne wandert um die Erde", "Die Erde dreht sich um sich selbst", "Der Mond verdeckt die Sonne"], c: 1, why: "Die Erde dreht sich in 24 Stunden einmal um sich selbst." },
        { q: "Wie wäre der Himmel ohne Luft?", a: ["Blau wie immer", "Schwarz, sogar am Tag", "Grün"], c: 1, why: "Erst die Luft verteilt das Sonnenlicht und macht den Himmel blau." }
      ]
    },

    /* ---------- Sonden (probe: true): Hier kann man nicht landen. Das Kind steuert eine Sonde durch Mess-Tore;
       jedes Tor ist eine Entdeckung (in dieser Reihenfolge). course = Texte für den Flug. ---------- */
    jupiter: {
      probe: true,
      flight: { who: "🎧 Flugleiterin Nora", gates: ["Nora hier! Erstes Tor voraus: Es misst, wie groß der Jupiter ist.", "Schau nach unten – das nächste Tor liegt über einem riesigen roten Wirbel!", "Letztes Tor! Wir sinken tiefer – gibt es hier einen Boden?"] },
      course: { note: "🪂 Kapsel wie „Galileo“ – Abstieg in die Wolken", miss: "Tor verpasst – es kommt gleich noch einmal!" },
      discoveries: [
        { key: "groesse", icon: "🟠", title: "Der größte Planet", photo: "jupiter.jpg",
          text: "Jupiter ist der größte Planet: 11-mal so breit wie die Erde! Mehr als 1.300 Erden würden hineinpassen." },
        { key: "fleck", icon: "🌀", title: "Der Große Rote Fleck", photo: "jupiter-1.jpg",
          text: "Der Große Rote Fleck ist ein Wirbelsturm – größer als die ganze Erde! Er tobt schon seit fast 200 Jahren." },
        { key: "gas", icon: "☁️", title: "Kein Boden in Sicht",
          text: "Kein Boden! Jupiter ist ein Gasriese. Nach unten wird das Gas nur immer dichter und heißer – landen kann man hier nicht." }
      ],
      radio: {
        start: "Hier ist die Bodenstation! {name}, auf dem Jupiter kann man nicht landen – er hat keinen festen Boden. Steuere deine Kapsel durch die {anzahl} leuchtenden Mess-Tore!",
        found: "Klasse! Noch {rest} übrig.",
        back: "Deine Kapsel ist wieder beim Jupiter, {name}! Noch {rest} Mess-Tore.",
        allFound: "Super, {name}! Alles entdeckt. Hier kommen {fragen} Funk-Fragen.",
        quizDone: "Hier hast du schon alles entdeckt! Tippe oben auf „Zurück zur Rakete“ – oder flieg noch ein bisschen."
      },
      quiz: [
        { q: "Welcher Planet ist der größte?", a: ["Saturn", "Die Erde", "Jupiter"], c: 2, why: "Jupiter ist der Riese unter den Planeten – 11-mal so breit wie die Erde." },
        { q: "Was ist der Große Rote Fleck?", a: ["Ein Vulkan", "Ein riesiger Sturm", "Ein Meer"], c: 1, why: "Ein Wirbelsturm, größer als die ganze Erde." },
        { q: "Was findet deine Kapsel, als sie in den Jupiter eintaucht?", a: ["Einen festen Boden aus Stein", "Immer dichteres Gas, aber keinen Boden", "Ein Meer aus Wasser"], c: 1, why: "Jupiter ist ein Gasriese – es wird nur immer dichter und heißer." }
      ]
    },

    saturn: {
      probe: true,
      flight: { who: "🎧 Flugleiterin Nora", gates: ["Nora hier! Erstes Tor voraus: Es misst, woraus die Ringe bestehen.", "Nächstes Tor: Es prüft, wie schwer der Saturn ist – rate mal!", "Letztes Tor über dem Nordpol – dort dreht sich ein seltsamer Sturm!"] },
      course: { note: "🛰️ Sonde „Cassini“ – Flug durch die Ringe", miss: "Tor verpasst – es kommt gleich noch einmal!", bump: "Rumms! Ein Eisbrocken – weich lieber aus!" },
      discoveries: [
        { key: "ringe", icon: "🧊", title: "Ringe aus Eis", photo: "saturn-1.jpg",
          text: "Die Ringe sind gar nicht fest! Sie bestehen aus unzähligen Brocken aus Eis und Gestein – manche klein wie Sandkörner, manche groß wie ein Haus." },
        { key: "leicht", icon: "🛁", title: "Leichter als Wasser", photo: "saturn.jpg",
          text: "Saturn ist riesig, aber sehr leicht. In einer Riesen-Badewanne würde er schwimmen!" },
        { key: "sechseck", icon: "⬡", title: "Der sechseckige Sturm",
          text: "Am Nordpol des Saturn tobt ein Sturm in Form eines Sechsecks! Jede Seite ist länger, als die Erde breit ist." }
      ],
      radio: {
        start: "Hier ist die Bodenstation! {name}, deine Sonde fliegt mitten durch die Ringe des Saturn. Flieg durch die {anzahl} Mess-Tore und weich den Eisbrocken aus!",
        found: "Klasse! Noch {rest} übrig.",
        back: "Deine Sonde ist wieder beim Saturn, {name}! Noch {rest} Mess-Tore.",
        allFound: "Super, {name}! Alles entdeckt. Hier kommen {fragen} Funk-Fragen.",
        quizDone: "Hier hast du schon alles entdeckt! Tippe oben auf „Zurück zur Rakete“ – oder flieg noch ein bisschen."
      },
      quiz: [
        { q: "Woraus bestehen die Ringe des Saturn?", a: ["Aus Eis und Gestein", "Aus Gold", "Aus Licht"], c: 0, why: "Aus unzähligen Brocken aus Eis und Gestein." },
        { q: "Was würde Saturn in einer riesigen Badewanne tun?", a: ["Untergehen", "Schwimmen", "Explodieren"], c: 1, why: "Saturn ist leichter als die gleiche Menge Wasser." },
        { q: "Welche Form hat der Sturm am Nordpol des Saturn?", a: ["Ein Sechseck", "Ein Herz", "Einen Stern"], c: 0, why: "Jede Seite des Sechsecks ist länger, als die Erde breit ist." }
      ]
    },

    uranus: {
      probe: true,
      flight: { who: "🎧 Flugleiterin Nora", gates: ["Nora hier! Erstes Tor voraus: Schau dir an, wie der Uranus liegt.", "Das nächste Tor misst, woraus der Uranus besteht.", "Letztes Tor! Brr – es misst die Temperatur."] },
      course: { note: "🛰️ Uranus-Sonde – eiskalt hier draußen!", miss: "Tor verpasst – es kommt gleich noch einmal!" },
      discoveries: [
        { key: "gekippt", icon: "🙃", title: "Auf der Seite", gallery: ["uranus.jpg", "uranus-1.jpg"],
          text: "Uranus liegt auf der Seite und rollt wie eine Kugel um die Sonne! Vielleicht hat ihn vor langer Zeit ein riesiger Brocken umgestoßen." },
        { key: "eisriese", icon: "🧊", title: "Ein Eisriese",
          text: "Uranus ist 4-mal so breit wie die Erde und besteht vor allem aus eisigen Stoffen. Einen festen Boden hat er nicht." },
        { key: "kalt", icon: "🥶", title: "Der kälteste Planet",
          text: "Bis zu −224 °C: Uranus ist der kälteste Planet – sogar kälter als Neptun!" }
      ],
      radio: {
        start: "Hier ist die Bodenstation! {name}, Uranus ist ein Riese aus eisigen Gasen – landen geht nicht. Steuere deine Sonde durch die {anzahl} Mess-Tore!",
        found: "Klasse! Noch {rest} übrig.",
        back: "Deine Sonde ist wieder beim Uranus, {name}! Noch {rest} Mess-Tore.",
        allFound: "Super, {name}! Alles entdeckt. Hier kommen {fragen} Funk-Fragen.",
        quizDone: "Hier hast du schon alles entdeckt! Tippe oben auf „Zurück zur Rakete“ – oder flieg noch ein bisschen."
      },
      quiz: [
        { q: "Was ist besonders an Uranus?", a: ["Er ist ganz aus Gold", "Er liegt auf der Seite", "Er ist der heißeste Planet"], c: 1, why: "Uranus ist stark gekippt und rollt wie eine Kugel um die Sonne." },
        { q: "Warum nennt man Uranus einen Eisriesen?", a: ["Weil er vor allem aus eisigen Stoffen besteht", "Weil er aus Glas ist", "Weil dort Schnee liegt"], c: 0, why: "Uranus besteht vor allem aus Wasser, Ammoniak und Methan." },
        { q: "Welcher Planet ist der kälteste?", a: ["Uranus", "Merkur", "Mars"], c: 0, why: "Auf Uranus kann es bis zu −224 °C kalt werden." }
      ]
    },

    neptun: {
      probe: true,
      flight: { who: "🎧 Flugleiterin Nora", gates: ["Nora hier! Spürst du den Wind? Erstes Tor voraus – lenk dagegen!", "Nächstes Tor: Wie weit sind wir von der Sonne weg?", "Letztes Tor! Es erzählt, wie der Neptun gefunden wurde – zuerst nur durch Rechnen!"] },
      course: { note: "🛰️ „Voyager 2“ – der Wind schiebt dich, lenk dagegen!", miss: "Tor verpasst – es kommt gleich noch einmal!" },
      discoveries: [
        { key: "wind", icon: "💨", title: "Die stärksten Winde",
          text: "Merkst du, wie es dich zur Seite drückt? Auf Neptun wehen die stärksten Winde im Sonnensystem: über 2.000 km/h!" },
        { key: "weit", icon: "📏", title: "Der äußerste Planet", photo: "neptun.jpg",
          text: "Neptun ist der äußerste Planet: 30-mal so weit von der Sonne weg wie die Erde. Das Sonnenlicht braucht 4 Stunden bis hierher." },
        { key: "rechnen", icon: "🧮", title: "Mit Mathematik gefunden",
          text: "Neptun wurde zuerst berechnet und dann entdeckt! 1846 fand man ihn in einer Sternwarte in Berlin – genau dort, wo Forscher es ausgerechnet hatten." }
      ],
      radio: {
        start: "Hier ist die Bodenstation! {name}, du bist am äußersten Planeten. Steuere Voyager 2 durch die {anzahl} Mess-Tore – der Sturm drückt dich zur Seite!",
        found: "Klasse! Noch {rest} übrig.",
        back: "Deine Sonde ist wieder beim Neptun, {name}! Noch {rest} Mess-Tore.",
        allFound: "Super, {name}! Alles entdeckt. Hier kommen {fragen} Funk-Fragen.",
        quizDone: "Hier hast du schon alles entdeckt! Tippe oben auf „Zurück zur Rakete“ – oder flieg noch ein bisschen."
      },
      quiz: [
        { q: "Welcher Planet ist am weitesten von der Sonne entfernt?", a: ["Uranus", "Neptun", "Saturn"], c: 1, why: "Neptun ist der achte und äußerste Planet." },
        { q: "Wie wurde Neptun entdeckt?", a: ["Zuerst berechnet, dann am Himmel gefunden", "Durch Zufall beim Spazierengehen", "Von einer Raumsonde"], c: 0, why: "Man rechnete aus, wo ein unbekannter Planet sein musste – und fand ihn genau dort." },
        { q: "Warum wurde deine Sonde zur Seite gedrückt?", a: ["Wegen der stärksten Winde im Sonnensystem", "Weil sie kaputt war", "Wegen eines Magneten"], c: 0, why: "Auf Neptun wehen Winde mit über 2.000 km/h." }
      ]
    },

    sonne: {
      probe: true,
      flight: { who: "🎧 Flugleiterin Nora", gates: ["Nora hier! Hitzeschild bereit? Erstes Tor voraus!", "Das nächste Tor stoppt die Zeit, die das Licht bis zur Erde braucht.", "Letztes Tor! Es schaut auf dunkle Flecken."] },
      course: { note: "🛡️ „Parker Solar Probe“ – Anflug auf die Sonne", miss: "Tor verpasst – es kommt gleich noch einmal!", bump: "Heiß! Ein Glutball – dein Hitzeschild hält, aber weich lieber aus!" },
      discoveries: [
        { key: "stern", icon: "⭐", title: "Ein Stern", gallery: ["sonne-1.jpg", "sonne-2.jpg"],
          text: "Die Sonne ist ein Stern – eine riesige, glühende Kugel aus Gas. 1,3 Millionen Erden würden in sie hineinpassen!" },
        { key: "licht", icon: "💡", title: "8 Minuten",
          text: "Das Sonnenlicht braucht 8 Minuten bis zur Erde. Ohne Licht und Wärme der Sonne gäbe es kein Leben bei uns." },
        { key: "flecken", icon: "⚫", title: "Sonnenflecken", photo: "sonne.jpg",
          text: "Die dunklen Punkte heißen Sonnenflecken. Dort ist die Sonne etwas kühler als ringsum. Viele sind größer als die ganze Erde!" }
      ],
      radio: {
        start: "Hier ist die Bodenstation! {name}, auf der Sonne kann niemand landen – sie ist glühendes Gas. Flieg mit deiner Hitzeschild-Sonde durch die {anzahl} Mess-Tore!",
        found: "Klasse! Noch {rest} übrig.",
        back: "Deine Sonde ist wieder bei der Sonne, {name}! Noch {rest} Mess-Tore.",
        allFound: "Super, {name}! Alles entdeckt. Hier kommen {fragen} Funk-Fragen.",
        quizDone: "Hier hast du schon alles entdeckt! Tippe oben auf „Zurück zur Rakete“ – oder flieg noch ein bisschen."
      },
      quiz: [
        { q: "Was ist die Sonne?", a: ["Ein Stern", "Ein Planet", "Ein Mond"], c: 0, why: "Die Sonne ist ein Stern – der Stern, der uns am nächsten ist." },
        { q: "Wie lange braucht das Sonnenlicht bis zur Erde?", a: ["1 Sekunde", "Etwa 8 Minuten", "Einen ganzen Tag"], c: 1, why: "Das Licht ist ungefähr 8 Minuten unterwegs." },
        { q: "Was sind Sonnenflecken?", a: ["Etwas kühlere Stellen auf der Sonne", "Löcher in der Sonne", "Schatten von Planeten"], c: 0, why: "Weil sie kühler sind als ihre Umgebung, sehen sie dunkel aus." }
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
