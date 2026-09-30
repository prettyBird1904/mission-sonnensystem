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
  version: "11",

  mnemonic: "Mein Vater erklärt mir jeden Sonntag unsere Nachbarplaneten.",

  /* Aussteigen & selbst erkunden (bisher: Mond).
     {name} = Name des Kindes, {rest} = noch offene Entdeckungen, {hoehe} = gemessene Sprunghöhe */
  surfaces: {
    mond: {
      gravity: 1.62, // m/s² – echte Mond-Schwerkraft (Erde: 9,81); gilt für den Hammer-und-Feder-Versuch
      moveGravity: 2.4, // fürs Laufen und Springen etwas stärker, damit es sich nicht zu zäh anfühlt
      jump: 0.45,       // Sprunghöhe in Metern (mit schwerem Raumanzug)
      // Thermometer am Raumanzug: in der Sonne / im Schatten
      temp: { sun: 120, shade: -150, sunText: "☀️ Sonne – glühend heiß!", shadeText: "❄️ Schatten – eiskalt!" },
      discoveries: [
        { key: "sprung", icon: "🦘", title: "Leichte Anziehung", hint: "Spring mal in die Luft!", fallback: { hoehe: "etwa 45 Zentimeter", zeit: "über 1" },
          text: "Du bist {hoehe} hoch gesprungen und {zeit} Sekunden durch die Luft geschwebt! Mit genau demselben Absprung kämst du auf der Erde nur ein Sechstel so hoch – der Mond zieht nur ein Sechstel so stark. Meterhoch geht es trotzdem nicht: Raumanzug und Rucksack wiegen zusammen fast so viel wie ein Erwachsener. So ähnlich ist Astronaut John Young 1972 für ein berühmtes Foto gesprungen." },
        { key: "apollo", icon: "👣", title: "Die erste Mondlandung", gallery: ["mond-1.jpg", "mond-2.jpg", "mond-3.jpg"],
          text: "Hier in der Nähe landeten im Juli 1969 Neil Armstrong und Buzz Aldrin mit der Mondfähre „Eagle“ – als allererste Menschen auf dem Mond! Das Unterteil der Fähre steht noch heute dort. Und ihre Fußabdrücke sind bis heute zu sehen: Auf dem Mond gibt es keinen Wind und keinen Regen, der sie verweht." },
        { key: "himmel", icon: "🔭", title: "Schwarzer Himmel", photo: "erde-1.jpg",
          text: "Obwohl die Sonne scheint, ist der Himmel schwarz! Auf der Erde verteilt die Luft das Sonnenlicht und macht den Himmel blau – auf dem Mond gibt es keine Luft. Und da oben schwebt unsere Erde: Vom Mond aus sieht sie fast 4-mal so groß aus wie der Mond bei uns am Himmel." },
        { key: "temperatur", icon: "🌡️", title: "Hitze und Kälte",
          text: "Hast du das Thermometer gesehen? In der Sonne wird der Mondboden bis zu 120 °C heiß. Im Schatten und in der Mondnacht wird es eiskalt – bis −170 °C! Ohne Luft wird die Wärme nicht verteilt. Nur dein Raumanzug schützt dich." },
        { key: "fallversuch", icon: "🪶", title: "Hammer und Feder",
          text: "Hammer und Feder sind genau gleichzeitig unten angekommen! Auf der Erde bremst die Luft die leichte Feder – sie segelt langsam herab. Auf dem Mond gibt es keine Luft, darum fällt alles gleich schnell. Astronaut Dave Scott hat genau diesen Versuch 1971 auf dem Mond gemacht!" },
        { key: "waage", icon: "⚖️", title: "Federleicht", fallback: { erde: "30", mond: "5,0" },
          text: "Auf der Erde wiegst du {erde} Kilo – hier zeigt die Waage nur {mond} Kilo! Dein Körper ist genau derselbe geblieben. Aber der Mond ist viel kleiner als die Erde und zieht nur ein Sechstel so stark an dir. Darum fühlst du dich hier so leicht." },
        // Fundstücke: die Inhalte des früheren Steckbriefs („Wusstest du?“, Eckdaten, Reisezeit) zum Selbst-Finden
        { key: "wegweiser", icon: "🪧", title: "Der weite Weg nach Hause",
          text: "Bis zur Erde sind es 384.400 Kilometer. Mit dem Auto (100 km/h) wärst du ohne Pause 160 Tage unterwegs! Die Apollo-Astronauten brauchten mit ihrer Rakete etwa 3 Tage. Und das Licht? Das schafft die Strecke in etwas mehr als 1 Sekunde." },
        { key: "antenne", icon: "📡", title: "Immer dieselbe Seite",
          text: "Die Sonne ist einmal über den ganzen Himmel gewandert – aber die Erde ist nicht vom Fleck gerückt! Der Mond dreht sich nämlich so, dass er der Erde immer dieselbe Seite zeigt. Darum muss diese Antenne nie nachgestellt werden. Und wir sehen von zu Hause immer dasselbe „Mondgesicht“ – die Rückseite des Mondes kann man von der Erde aus nie sehen! Ein Tag auf dem Mond dauert fast einen Monat: etwa zwei Wochen ist es hell, dann zwei Wochen dunkel." },
        { key: "spiegel", icon: "🪞", title: "Der Laser-Spiegel",
          text: "Das Licht war in nur 2,6 Sekunden von der Erde zum Mond und wieder zurück! So einen Spiegel haben die Apollo-Astronauten 1969 auf dem Mond aufgestellt – Forscher benutzen ihn bis heute. Aus der gemessenen Zeit rechnen sie aus, wie weit der Mond entfernt ist: rund 384.400 Kilometer. Übrigens: Auch der Mond selbst leuchtet nicht. Er wird von der Sonne angestrahlt und wirft ihr Licht zurück – wie ein Spiegel." },
        { key: "mondstein", icon: "🪨", title: "Krater und Mondgestein", photo: "mond.jpg",
          text: "Du stehst mitten in einem Krater! Er ist entstanden, als ein Brocken aus dem All eingeschlagen ist. Auf der Erde verglühen die meisten Brocken in der Luft – der Mond hat keine Luft, die ihn schützt. Darum ist er voller Krater. Die Apollo-Astronauten haben 382 Kilo Mondgestein mit zur Erde gebracht. Der Mond ist 3.474 Kilometer breit – etwa ein Viertel so breit wie die Erde." }
      ],
      stations: {
        // action = Knopf an der Station · again = Knopf, um schon Entdecktes nochmal anzusehen · reach = Reichweite in Metern
        // hint = Tipp in der Liste „Meine Entdeckungen“ · small + auto = Fundstück: kleines Licht, Entdeckung beim Hingehen (Meter)
        apollo:      { label: "Landestelle von 1969", hint: "Geh zur Mondfähre", again: "👣 Nochmal ansehen", reach: 6 },
        himmel:      { label: "Fernrohr", hint: "Schau durch das Fernrohr", action: "🔭 Durchschauen" },
        temperatur:  { label: "Schatten am Felsen", hint: "Stell dich in den Schatten des großen Felsens", again: "🌡️ Nochmal ansehen", reach: 5 },
        fallversuch: { label: "Experiment-Tisch", hint: "Probier den Versuch am Tisch aus", action: "🪶 Hammer & Feder fallen lassen" },
        waage:       { label: "Waage", hint: "Stell dich auf die Waage", action: "⚖️ Auf die Waage stellen" },
        wegweiser:   { label: "Wegweiser", hint: "Such ein goldenes Licht nahe bei deiner Rakete", again: "🪧 Nochmal ansehen", small: true, auto: 2.6 },
        // Tafelwand der Mondstation: keine Entdeckung (info), öffnet die Liste „Meine Entdeckungen“
        wand:        { label: "Wusstest du?", action: "📋 Meine Entdeckungen lesen", info: true, reach: 6.5 },
        // Exponate auf dem Platz vor der Mondstation
        antenne:     { label: "Antenne", hint: "Geh zur Mondstation und probier die Antenne aus", action: "⏩ Zeit vorspulen" },
        spiegel:     { label: "Laser-Spiegel", hint: "Geh zur Mondstation und probier den Laser-Spiegel aus", action: "🔦 Laser-Messung starten" },
        mondstein:   { label: "Mondstein im Krater", hint: "Such ein goldenes Licht im Krater hinter deiner Rakete", again: "🪨 Nochmal ansehen", small: true, auto: 2.6 },
        rakete:      { label: "Deine Rakete", action: "🚀 Einsteigen", home: true }
      },
      // Fernrohr: Erde selbst suchen → Größe vergleichen → ausprobieren, was Luft mit dem Himmel macht
      scope: {
        aim: "Such unsere Erde! Zieh mit der Maus über den Himmel oder nimm die Pfeiltasten, um das Fernrohr zu schwenken.",
        aimTouch: "Such unsere Erde! Wische über den Himmel, um das Fernrohr zu schwenken.",
        hint: "Tipp der Bodenstation: Die Erde ist in dieser Richtung",
        almost: "Fast! Halte das Fernrohr genau auf die Erde.",
        found: "Gefunden! Das ist unsere Erde. Dort sind gerade alle Menschen, die du kennst.",
        compareBtn: "🌕 Wie groß ist sie?",
        compare: "Links: die Erde, vom Mond aus gesehen. Rechts: der Mond, so klein wie wir ihn von zu Hause sehen. Die Erde sieht fast 4-mal so groß aus!",
        next: "Weiter ▶",
        airIntro: "Schau dir den Himmel an: Die Sonne scheint – und trotzdem ist er schwarz! Auf dem Mond gibt es keine Luft. Was wäre, wenn es hier Luft gäbe? Probier es aus!",
        airOn: "🌬️ Luft an",
        airOff: "🚫 Luft aus",
        airOnText: "Mit Luft: Die Luft verteilt das Sonnenlicht über den ganzen Himmel. Er wird blau und die Sterne verschwinden – genau wie bei uns auf der Erde.",
        airOffText: "Ohne Luft: Nichts verteilt das Sonnenlicht. Der Himmel bleibt schwarz – sogar mitten am Tag!",
        done: "Fertig ✓"
      },
      // Waage: eigenes Gewicht einstellen ({erde}) und ablesen, was die Waage auf dem Mond zeigt ({mond})
      weigh: {
        text: "Stell ein, wie viel du auf der Erde wiegst: {erde} Kilo. Hier auf dem Mond zeigt die Waage nur {mond} Kilo!",
        less: "➖ leichter", more: "➕ schwerer", done: "Fertig ✓"
      },
      // Laser-Spiegel: Licht von der Erde zum Spiegel und zurück, die Stoppuhr läuft in echter Zeit mit
      laser: {
        ready: "Die Bodenstation schickt gleich einen Laserstrahl von der Erde zu diesem Spiegel. Stopp die Zeit mit: Achtung … fertig …",
        hin: "Los! Das Licht rast von der Erde zum Mond …",
        zurueck: "Treffer! Der Spiegel wirft das Licht zurück zur Erde …",
        end: "Wieder auf der Erde – nach nur 2,6 Sekunden! Ein Auto bräuchte für diesen Weg hin und zurück fast ein ganzes Jahr.",
        again: "🔦 Nochmal", done: "Fertig ✓"
      },
      // Antenne: Zeitraffer über einen Mond-Tag ({tag} von {tage} Erdtagen)
      lapse: {
        ready: "Die Antenne zeigt genau zur Erde. Jetzt spulen wir die Zeit vor: Beobachte die Sonne, die Schatten – und die Erde!",
        day: "Erdtag {tag} von {tage}: Die Sonne wandert über den Himmel. Und die Erde?",
        night: "Erdtag {tag} von {tage}: Jetzt ist Mondnacht – zwei Wochen lang! Und die Erde?",
        end: "Ein ganzer Mond-Tag ist vorbei. Die Sonne ist einmal rundherum gewandert – aber die Erde steht noch genau an derselben Stelle!",
        again: "⏩ Nochmal", done: "Fertig ✓"
      },
      // {anzahl} = Zahl der Entdeckungen, {fragen} = Zahl der Funk-Fragen am Ende
      radio: {
        start: "Hier ist die Bodenstation! Willkommen auf dem Mond, {name}! Hier gibt es {anzahl} Dinge zu entdecken. Die hohen Lichtsäulen zeigen dir die Stationen, die kleinen goldenen Lichter sind Fundstücke. An der Wand der Mondstation erscheint alles, was du entdeckt hast. Probier doch zuerst mal zu springen!",
        found: "Klasse Entdeckung! Noch {rest} übrig.",
        back: "Willkommen zurück auf dem Mond, {name}! Dir fehlen noch {rest} Entdeckungen – folge den Lichtern. Tipps findest du oben rechts bei der Lupe.",
        allFound: "Fantastisch, {name}! Du hast alles entdeckt. Die Bodenstation hat noch {fragen} Fragen an dich.",
        tooFar: "Bodenstation an {name}: Bitte entferne dich nicht zu weit von der Rakete!",
        quizDone: "Mission erfüllt! Wenn du fertig bist, lauf zurück zu deiner Rakete und steig über die Leiter ein – oder erkunde noch ein bisschen."
      },
      quiz: [
        { q: "Was passiert, wenn du auf dem Mond genauso kräftig abspringst wie auf der Erde?", a: ["Ich komme genauso hoch", "Ich komme etwa 6-mal so hoch und schwebe lange", "Ich fliege ins All davon"], c: 1, why: "Der Mond zieht nur ein Sechstel so stark wie die Erde – man kommt 6-mal so hoch und schwebt lange." },
        { q: "Warum ist der Himmel auf dem Mond schwarz?", a: ["Weil es dort keine Luft gibt", "Weil dort immer Nacht ist", "Weil die Sonne dort nicht scheint"], c: 0, why: "Ohne Luft wird das Sonnenlicht nicht verteilt – der Himmel bleibt schwarz." },
        { q: "Was kommt auf dem Mond zuerst unten an?", a: ["Der Hammer", "Die Feder", "Beide gleichzeitig"], c: 2, why: "Ohne Luft bremst nichts die Feder – alles fällt gleich schnell." }
      ]
    },

    mars: {
      gravity: 3.71, // m/s² – echte Mars-Schwerkraft
      jump: 0.3,
      temp: { sun: -50, shade: -75, sunText: "☀️ Sonne – trotzdem eiskalt!", shadeText: "❄️ Schatten – noch kälter!" },
      discoveries: [
        { key: "sprung", icon: "🦘", title: "Leichter als zu Hause", hint: "Spring mal in die Luft!", fallback: { hoehe: "etwa 30 Zentimeter", zeit: "0,8" },
          text: "Du bist {hoehe} hoch gesprungen – und das mit einem schweren Raumanzug! Der Mars ist kleiner als die Erde und zieht nur gut ein Drittel so stark an dir. Auf dem Mond wärst du noch höher gekommen, auf der Erde viel weniger hoch." },
        { key: "waage", icon: "⚖️", title: "Ein Drittel so schwer", fallback: { erde: "30", mond: "11,3" },
          text: "Auf der Erde wiegst du {erde} Kilo – hier zeigt die Waage nur {mond} Kilo! Der Mars ist nur etwa halb so breit wie die Erde. Darum zieht er schwächer an dir: Du fühlst dich nur gut ein Drittel so schwer." },
        { key: "rover", icon: "🤖", title: "Rover auf Spurensuche", gallery: ["mars-1.jpg", "mars-2.jpg"],
          text: "Dein Rover hat den hellen Stein untersucht: Er ist vor langer Zeit in Wasser entstanden! Früher gab es auf dem Mars Flüsse und Seen. Echte Rover wie „Curiosity“ und „Perseverance“ fahren seit Jahren über den Mars und suchen nach Spuren von Wasser und Leben. Sie werden von der Erde aus gesteuert – jedes Funksignal ist viele Minuten unterwegs." },
        { key: "rost", icon: "🧲", title: "Rost im Marsstaub",
          text: "Der Staub ist am Magneten hängen geblieben! Im Marsstaub steckt nämlich Eisen – und dieses Eisen ist verrostet. Rost ist rotbraun, und der Staub liegt überall. Darum sieht der ganze Mars rot aus. Auch die echten Mars-Rover hatten Magnete dabei, um den Staub zu untersuchen." },
        { key: "vulkan", icon: "🌋", title: "Der höchste Vulkan",
          text: "Der Olympus Mons ist der höchste Vulkan im ganzen Sonnensystem: etwa 22 Kilometer hoch! Das ist zweieinhalbmal so hoch wie der Mount Everest und mehr als siebenmal so hoch wie die Zugspitze. Und dein Hubschrauber? 2021 flog „Ingenuity“ auf dem Mars – das allererste Fluggerät auf einem anderen Planeten." },
        { key: "monde", icon: "🥔", title: "Zwei kleine Monde",
          text: "Der Mars hat zwei Monde: Phobos und Deimos. Beide sind winzig und sehen aus wie Kartoffeln! Phobos ist nur etwa 22 Kilometer groß und saust in knapp 8 Stunden einmal um den Mars. Deimos ist noch kleiner. Unser Mond ist fast 300-mal so breit wie Deimos." },
        { key: "abend", icon: "🌇", title: "Blauer Sonnenuntergang",
          text: "Auf dem Mars ist der Sonnenuntergang blau! Bei uns ist es genau umgekehrt: Am Tag ist der Himmel blau und am Abend rot. Das liegt am feinen Staub in der dünnen Marsluft. Ein Tag auf dem Mars dauert 24 Stunden und 37 Minuten – fast genauso lang wie bei uns." },
        { key: "eis", icon: "🧊", title: "Eis unter dem Staub",
          text: "Unter dem roten Staub liegt gefrorenes Wasser! Genau so hat die Landesonde „Phoenix“ 2008 Eis auf dem Mars gefunden. An den Polen hat der Mars sogar dicke Eiskappen. Flüssiges Wasser gibt es heute nicht mehr: Es ist mit etwa −60 °C viel zu kalt, und die Luft ist zu dünn." },
        { key: "teufel", icon: "🌪️", title: "Staubteufel!",
          text: "Erwischt! Staubteufel sind kleine Wirbelwinde, die den roten Staub hochreißen. Sie haben schon echten Mars-Rovern geholfen: Sie pusteten den Staub von deren Sonnensegeln! Manchmal gibt es auf dem Mars aber auch riesige Staubstürme, die den ganzen Planeten einhüllen." },
        { key: "wegweiser", icon: "🪧", title: "Weit weg von der Sonne",
          text: "Der Mars ist der vierte Planet. Bis zur Sonne sind es 228 Millionen Kilometer – anderthalbmal so weit wie von der Erde. Darum ist es hier kälter, und die Sonne sieht kleiner aus. Ein Jahr dauert auf dem Mars 687 Erdtage, also fast zwei Erdjahre. Eine Rakete braucht von der Erde bis hierher etwa 7 Monate." }
      ],
      stations: {
        wand:      { label: "Wusstest du?", action: "📋 Meine Entdeckungen lesen", info: true, reach: 6.5 },
        waage:     { label: "Waage", hint: "Stell dich auf die Waage", action: "⚖️ Auf die Waage stellen" },
        rover:     { label: "Rover-Steuerpult", hint: "Steuere den Rover vom Steuerpult aus", action: "🤖 Rover fernsteuern" },
        rost:      { label: "Magnet-Versuch", hint: "Geh zur Marsstation und probier den Magneten aus", action: "🧲 Magnet-Versuch starten" },
        vulkan:    { label: "Hubschrauber", hint: "Steig mit dem Hubschrauber auf", action: "🚁 Mit dem Hubschrauber aufsteigen" },
        monde:     { label: "Fernrohr", hint: "Schau durch das Fernrohr", action: "🔭 Durchschauen" },
        abend:     { label: "Himmelskamera", hint: "Geh zur Marsstation und probier die Himmelskamera aus", action: "⏩ Zeit vorspulen bis zum Abend" },
        eis:       { label: "Bohrer", hint: "Such den Bohrer hinter deiner Rakete", action: "⛏️ Bohrer benutzen" },
        teufel:    { label: "Staubteufel", hint: "Fang den Staubteufel – er wirbelt hinter deiner Rakete herum", again: "🌪️ Nochmal ansehen", small: true, auto: 3.2, reach: 4 },
        wegweiser: { label: "Wegweiser", hint: "Such ein goldenes Licht nahe bei deiner Rakete", again: "🪧 Nochmal ansehen", small: true, auto: 2.6 },
        rakete:    { label: "Deine Rakete", action: "🚀 Einsteigen", home: true }
      },
      weigh: {
        text: "Stell ein, wie viel du auf der Erde wiegst: {erde} Kilo. Hier auf dem Mars zeigt die Waage nur {mond} Kilo!",
        less: "➖ leichter", more: "➕ schwerer", done: "Fertig ✓"
      },
      rover: {
        drive: "Steuere den Rover mit W, A, S, D zum hellen Stein mit dem goldenen Licht!",
        driveTouch: "Steuere den Rover mit dem Joystick zum hellen Stein mit dem goldenen Licht!",
        found: "Geschafft! Der Rover untersucht den Stein mit seinem Roboterarm …",
        done: "Was hat er gefunden? ▶"
      },
      heli: {
        rising: "Der Hubschrauber steigt auf … Schau, wie klein deine Rakete wird!",
        intro: "Da hinten am Horizont: der Olympus Mons, der höchste Vulkan im ganzen Sonnensystem. Wie hoch ist er wohl? Stell bekannte Berge daneben!",
        everestBtn: "🏔️ Mount Everest", zugspitzeBtn: "⛰️ Zugspitze",
        everest: "Das ist der Mount Everest, der höchste Berg der Erde: fast 9 Kilometer hoch. Neben dem Olympus Mons sieht er klein aus!",
        zugspitze: "Das ist die Zugspitze, der höchste Berg Deutschlands: fast 3 Kilometer hoch. Man sieht sie kaum!",
        all: "Der Olympus Mons ist 22 Kilometer hoch – zweieinhalbmal so hoch wie der Mount Everest und mehr als siebenmal so hoch wie die Zugspitze!",
        done: "Landen ✓"
      },
      moons: {
        aim: "Der Mars hat zwei Monde. Such den größeren! Zieh mit der Maus über den Himmel oder nimm die Pfeiltasten.",
        aimTouch: "Der Mars hat zwei Monde. Such den größeren! Wische über den Himmel, um das Fernrohr zu schwenken.",
        hint: "Tipp der Bodenstation: Der Mond ist in dieser Richtung",
        almost: "Fast! Halte das Fernrohr genau auf den Mond.",
        phobos: "Gefunden! Das ist Phobos. Er ist nicht rund wie unser Mond – er sieht aus wie eine Kartoffel!",
        deimosBtn: "🔭 Zweiten Mond suchen",
        deimos: "Und das ist Deimos. Er ist noch kleiner: nur etwa 12 Kilometer groß. So weit könntest du an einem Nachmittag wandern!",
        done: "Fertig ✓"
      },
      drill: {
        steps: [
          "Unter dem roten Staub ist vielleicht etwas versteckt. Bohr nach!",
          "10 Zentimeter tief: nur roter Staub. Weiter!",
          "20 Zentimeter tief: Der Boden wird steinhart. Noch einmal!",
          "30 Zentimeter tief: Eis! Unter dem Marsstaub liegt gefrorenes Wasser."
        ],
        drill: "⛏️ Bohren", done: "Fertig ✓"
      },
      magnet: {
        ready: "In der Schale liegt Marsstaub. Warum ist er so rot? Halte einen Magneten hinein!",
        go: "🧲 Magnet in den Staub halten",
        running: "Der Magnet senkt sich in den Staub …",
        end: "Der Staub klebt am Magneten! Im Marsstaub steckt also Eisen – verrostetes Eisen. Und Rost ist rotbraun.",
        again: "🧲 Nochmal", done: "Fertig ✓"
      },
      dusk: {
        ready: "Am Tag ist der Marshimmel gelbbraun vom Staub. Welche Farbe hat wohl der Sonnenuntergang? Wir spulen die Zeit vor …",
        running: "Die Sonne sinkt … es wird Abend auf dem Mars.",
        end: "Der Sonnenuntergang auf dem Mars ist blau! Bei uns ist es genau umgekehrt: tagsüber blau, abends rot.",
        again: "⏩ Nochmal", done: "Fertig ✓"
      },
      radio: {
        start: "Hier ist die Bodenstation! Willkommen auf dem Mars, {name}! Hier gibt es {anzahl} Dinge zu entdecken. Die hohen Lichtsäulen zeigen dir die Stationen, die kleinen goldenen Lichter sind Fundstücke. An der Wand der Marsstation erscheint alles, was du entdeckt hast. Probier doch zuerst mal zu springen!",
        found: "Klasse Entdeckung! Noch {rest} übrig.",
        back: "Willkommen zurück auf dem Mars, {name}! Dir fehlen noch {rest} Entdeckungen – folge den Lichtern. Tipps findest du oben rechts bei der Lupe.",
        allFound: "Fantastisch, {name}! Du hast alles entdeckt. Die Bodenstation hat noch {fragen} Fragen an dich.",
        tooFar: "Bodenstation an {name}: Bitte entferne dich nicht zu weit von der Rakete!",
        quizDone: "Mission erfüllt! Wenn du fertig bist, lauf zurück zu deiner Rakete und steig über die Leiter ein – oder erkunde noch ein bisschen."
      },
      quiz: [
        { q: "Welche Farbe hat der Sonnenuntergang auf dem Mars?", a: ["Rot", "Blau", "Grün"], c: 1, why: "Der feine Staub in der dünnen Marsluft lässt den Himmel um die Abendsonne blau leuchten." },
        { q: "Was lag unter dem roten Staub, als du gebohrt hast?", a: ["Eis", "Gold", "Lava"], c: 0, why: "Unter dem Staub liegt gefrorenes Wasser – das hat auch die Sonde Phoenix gefunden." },
        { q: "Wie sehen die beiden Marsmonde aus?", a: ["Rund wie unser Mond", "Wie kleine Kartoffeln", "Wie Ringe"], c: 1, why: "Phobos und Deimos sind winzig und unregelmäßig geformt." }
      ]
    },

    merkur: {
      gravity: 3.7, jump: 0.3,
      temp: { sun: 430, shade: -180, sunText: "☀️ Sonne – heißer als ein Backofen!", shadeText: "❄️ Schatten – eiskalt!" },
      discoveries: [
        { key: "sprung", icon: "🦘", title: "Klein, aber schwer", hint: "Spring mal in die Luft!", fallback: { hoehe: "etwa 30 Zentimeter", zeit: "0,8" },
          text: "Du bist {hoehe} hoch gesprungen. Der Merkur zieht nur gut ein Drittel so stark an dir wie die Erde – genauso stark wie der Mars, obwohl der Merkur viel kleiner ist! Das liegt an seinem riesigen, schweren Kern aus Eisen." },
        { key: "waage", icon: "⚖️", title: "Ein Drittel so schwer", fallback: { erde: "30", mond: "11,3" },
          text: "Auf der Erde wiegst du {erde} Kilo – hier zeigt die Waage nur {mond} Kilo! Der Merkur ist der kleinste Planet. Trotzdem zieht er ziemlich stark an dir, denn in seinem Inneren steckt eine riesige Kugel aus Eisen." },
        { key: "temperatur", icon: "🌡️", title: "Backofen und Eisschrank",
          text: "Hast du das Thermometer gesehen? In der Sonne wird es auf dem Merkur 430 °C heiß – heiß genug, um Blei zu schmelzen! Im Schatten und in der Nacht sind es −180 °C. Der Merkur hat keine Lufthülle, die die Wärme festhält oder verteilt. Kein anderer Planet hat so große Unterschiede." },
        { key: "sonne", icon: "☀️", title: "Die riesige Sonne",
          text: "Vom Merkur aus sieht die Sonne fast dreimal so breit aus wie von der Erde! Kein Planet ist der Sonne näher. Die dunklen Punkte sind Sonnenflecken – manche sind größer als die Erde. Wichtig: Schau niemals ohne Spezialfilter in die Sonne, auch nicht zu Hause!" },
        { key: "krater", icon: "☄️", title: "Einschlag!", photo: "merkur-1.jpg",
          text: "Der Brocken ist eingeschlagen, ohne zu verglühen! Auf der Erde bremst die Luft solche Brocken: Sie leuchten als Sternschnuppen auf und verglühen meistens. Der Merkur hat keine Luft. Darum ist er voller Krater und sieht fast aus wie unser Mond. Auf dem Foto: der Munch-Krater, 58 Kilometer breit." },
        { key: "jahr", icon: "🏁", title: "Der schnellste Planet",
          text: "Der Merkur saust in nur 88 Erdtagen einmal um die Sonne. Während die Erde eine Runde schafft, dreht er mehr als vier! Wer 9 Erdjahre alt ist, wäre auf dem Merkur schon 37 Merkur-Jahre alt. Dafür dreht er sich selbst ganz langsam: Von einem Sonnenaufgang bis zum nächsten vergehen 176 Erdtage." },
        { key: "groesse", icon: "📏", title: "Der kleinste Planet",
          text: "Der Merkur ist der kleinste Planet: 4.879 Kilometer breit. Er ist nur ein bisschen größer als unser Mond. Die Erde ist fast dreimal so breit. Einen eigenen Mond hat der Merkur nicht." },
        { key: "eis", icon: "🧊", title: "Eis im ewigen Schatten",
          text: "Eis – auf dem Planeten, der der Sonne am nächsten ist! In tiefe Krater an den Polen scheint niemals die Sonne. Dort ist es immer eiskalt, und dort liegt gefrorenes Wasser." },
        { key: "sonde", icon: "🛰️", title: "Besuch von der Erde", photo: "merkur.jpg",
          text: "Das ist ein Modell der Raumsonde MESSENGER. Sie umkreiste den Merkur von 2011 bis 2015 und hat ihn komplett fotografiert. Eine Reise zum Merkur ist schwierig: Die Sonne zieht so stark, dass eine Sonde ständig bremsen muss. Die nächste Sonde heißt BepiColombo und ist schon unterwegs." },
        { key: "wegweiser", icon: "🪧", title: "Ganz nah an der Sonne",
          text: "Der Merkur ist der erste Planet. Bis zur Sonne sind es nur 58 Millionen Kilometer. Das Sonnenlicht braucht gut 3 Minuten bis hierher – bis zur Erde braucht es 8 Minuten." }
      ],
      stations: {
        wand:       { label: "Wusstest du?", action: "📋 Meine Entdeckungen lesen", info: true, reach: 6.5 },
        waage:      { label: "Waage", hint: "Stell dich auf die Waage", action: "⚖️ Auf die Waage stellen" },
        temperatur: { label: "Schatten am Felsen", hint: "Stell dich in den Schatten des großen Felsens", again: "🌡️ Nochmal ansehen", reach: 5 },
        sonne:      { label: "Sonnen-Fernrohr", hint: "Schau durch das Sonnen-Fernrohr", action: "🔭 Durchschauen" },
        krater:     { label: "Einschlag-Versuch", hint: "Probier den Einschlag-Versuch aus", action: "☄️ Einschlag-Versuch starten" },
        jahr:       { label: "Planeten-Rennen", hint: "Geh zur Merkurstation und starte das Planeten-Rennen", action: "🏁 Planeten-Rennen ansehen" },
        groesse:    { label: "Größenvergleich", hint: "Geh zur Merkurstation und schau dir die Kugeln an", action: "📏 Größe schätzen" },
        eis:        { label: "Eis im Krater", hint: "Such ein goldenes Licht im tiefen Krater hinter deiner Rakete", again: "🧊 Nochmal ansehen", small: true, auto: 2.8 },
        sonde:      { label: "Raumsonde", hint: "Such ein goldenes Licht hinter deiner Rakete", again: "🛰️ Nochmal ansehen", small: true, auto: 2.8 },
        wegweiser:  { label: "Wegweiser", hint: "Such ein goldenes Licht nahe bei deiner Rakete", again: "🪧 Nochmal ansehen", small: true, auto: 2.6 },
        rakete:     { label: "Deine Rakete", action: "🚀 Einsteigen", home: true }
      },
      weigh: {
        text: "Stell ein, wie viel du auf der Erde wiegst: {erde} Kilo. Hier auf dem Merkur zeigt die Waage nur {mond} Kilo!",
        less: "➖ leichter", more: "➕ schwerer", done: "Fertig ✓"
      },
      sunScope: {
        aim: "Dieses Fernrohr hat einen dunklen Sonnenfilter. Such die Sonne! Zieh mit der Maus über den Himmel oder nimm die Pfeiltasten.",
        aimTouch: "Dieses Fernrohr hat einen dunklen Sonnenfilter. Such die Sonne! Wische über den Himmel, um es zu schwenken.",
        hint: "Tipp der Bodenstation: Die Sonne ist in dieser Richtung",
        almost: "Fast! Halte das Fernrohr genau auf die Sonne.",
        found: "Das ist die Sonne durch den Filter. Siehst du die dunklen Sonnenflecken? Manche sind größer als die Erde!",
        compareBtn: "☀️ Und von der Erde aus?",
        compare: "Die kleine Scheibe daneben: So sehen wir die Sonne von der Erde. Vom Merkur aus ist sie fast dreimal so breit!",
        done: "Fertig ✓"
      },
      impact: {
        ready: "Auf der Erde verglühen Brocken aus dem All meistens in der Luft – als Sternschnuppen. Und hier, ganz ohne Luft?",
        go: "☄️ Brocken fallen lassen",
        running: "Achtung, er kommt …",
        end: "Eingeschlagen – ohne zu verglühen! So sind alle Krater auf dem Merkur entstanden.",
        again: "☄️ Nochmal", done: "Fertig ✓"
      },
      orrery: {
        ready: "Merkur (innen) und die Erde (außen) laufen um die Sonne. Wer ist schneller? Starte das Rennen!",
        go: "🏁 Rennen starten",
        run: "Erdtage: {erde} · Merkur hat schon {planet} Runden geschafft",
        end: "Die Erde hat eine Runde geschafft – der Merkur schon mehr als vier! Ein Merkur-Jahr dauert nur 88 Erdtage.",
        again: "🏁 Nochmal", done: "Fertig ✓"
      },
      guess: {
        q: "Was ist größer: der Merkur oder unser Mond?", a: ["Der Merkur", "Unser Mond"], c: 0,
        right: "Richtig!", wrong: "Nicht ganz.",
        why: "Der Merkur ist ein bisschen größer als unser Mond – und trotzdem der kleinste Planet. Die Erde ist fast dreimal so breit.",
        done: "Fertig ✓"
      },
      radio: {
        start: "Hier ist die Bodenstation! Willkommen auf dem Merkur, {name}! Hier gibt es {anzahl} Dinge zu entdecken. Die hohen Lichtsäulen zeigen dir die Stationen, die kleinen goldenen Lichter sind Fundstücke. An der Wand der Merkurstation erscheint alles, was du entdeckt hast. Schau mal, wie riesig die Sonne ist!",
        found: "Klasse Entdeckung! Noch {rest} übrig.",
        back: "Willkommen zurück auf dem Merkur, {name}! Dir fehlen noch {rest} Entdeckungen – folge den Lichtern. Tipps findest du oben rechts bei der Lupe.",
        allFound: "Fantastisch, {name}! Du hast alles entdeckt. Die Bodenstation hat noch {fragen} Fragen an dich.",
        tooFar: "Bodenstation an {name}: Bitte entferne dich nicht zu weit von der Rakete!",
        quizDone: "Mission erfüllt! Wenn du fertig bist, lauf zurück zu deiner Rakete und steig über die Leiter ein – oder erkunde noch ein bisschen."
      },
      quiz: [
        { q: "Warum verglühen Brocken aus dem All auf dem Merkur nicht?", a: ["Weil es dort keine Luft gibt", "Weil es dort zu kalt ist", "Weil sie zu klein sind"], c: 0, why: "Ohne Luft bremst und erhitzt nichts die Brocken – sie schlagen ein und hinterlassen Krater." },
        { q: "Wo gibt es auf dem Merkur Eis?", a: ["Überall", "In Kratern, in die nie die Sonne scheint", "Nirgends"], c: 1, why: "In tiefen Kratern an den Polen ist es immer eiskalt – dort liegt gefrorenes Wasser." },
        { q: "Wie sieht die Sonne vom Merkur aus?", a: ["Kleiner als bei uns", "Genauso groß wie bei uns", "Fast dreimal so breit"], c: 2, why: "Der Merkur ist der Sonne am nächsten – darum sieht sie dort riesig aus." }
      ]
    },

    pluto: {
      gravity: 0.62, // m/s² – echte Schwerkraft auf Pluto
      moveGravity: 1.2, // fürs Laufen und Springen stärker, sonst schwebt man ewig
      jump: 1.6,
      temp: { sun: -228, shade: -233, sunText: "☀️ Sonne – sie wärmt kaum!", shadeText: "❄️ Schatten – eisig!" },
      discoveries: [
        { key: "sprung", icon: "🦘", title: "Riesensprung", hint: "Spring mal in die Luft!", fallback: { hoehe: "etwa 160 Zentimeter", zeit: "über 3" },
          text: "Du bist {hoehe} hoch gesprungen und {zeit} Sekunden lang geschwebt – und das im schweren Raumanzug! Pluto ist winzig und zieht nur ganz schwach an dir: etwa ein Sechzehntel so stark wie die Erde." },
        { key: "waage", icon: "⚖️", title: "Leicht wie eine Feder", fallback: { erde: "30", mond: "1,9" },
          text: "Auf der Erde wiegst du {erde} Kilo – hier zeigt die Waage nur {mond} Kilo! So viel wie eine große Flasche Wasser. Pluto ist so klein, dass er kaum an dir zieht." },
        { key: "charon", icon: "🌗", title: "Charon, der große Mond",
          text: "Charon ist Plutos größter Mond – halb so breit wie Pluto selbst! Am Pluto-Himmel sieht er 7-mal so groß aus wie unser Mond bei uns. Pluto und Charon zeigen sich immer dieselbe Seite: Deshalb steht Charon immer an derselben Stelle am Himmel. Insgesamt hat Pluto 5 Monde. Und die Sonne ist von hier aus nur noch ein sehr heller Stern." },
        { key: "herz", icon: "🤍", title: "Das Herz von Pluto", photo: "pluto.jpg",
          text: "Von oben erkennst du es: ein riesiges Herz! Es ist eine glatte Ebene aus Eis, über 1.000 Kilometer breit. Die Raumsonde New Horizons hat es 2015 entdeckt – auf ihrem Foto siehst du es auch." },
        { key: "funk", icon: "📡", title: "Unendlich weit weg",
          text: "Dein Funkspruch braucht 5½ Stunden bis zur Erde – obwohl er mit Lichtgeschwindigkeit fliegt! Pluto ist 5,9 Milliarden Kilometer von der Sonne entfernt. Zum Vergleich: Vom Mond zur Erde braucht ein Funkspruch nur gut 1 Sekunde." },
        { key: "jahr", icon: "🏁", title: "248 Jahre für eine Runde",
          text: "Pluto braucht 248 Erdjahre für eine einzige Runde um die Sonne! Seit er 1930 entdeckt wurde, hat er noch nicht einmal eine halbe Runde geschafft. Auf Pluto könnte niemand Geburtstag feiern. Ein Tag dauert dort etwa 6 Erdtage." },
        { key: "groesse", icon: "📏", title: "Ein Zwergplanet",
          text: "Pluto ist kleiner als unser Mond: nur 2.377 Kilometer breit. Früher galt er als neunter Planet. Weil er so klein ist, nennt man ihn seit 2006 Zwergplanet." },
        { key: "eis", icon: "⛸️", title: "Rutschpartie auf Stickstoff-Eis",
          text: "Du rutschst! Das Herz ist eine glatte Fläche aus gefrorenem Stickstoff. Bei uns ist Stickstoff ein Gas in der Luft, die wir atmen. Hier ist es mit −230 °C so kalt, dass er zu Eis gefriert. Die Berge am Rand sind aus Wassereis – hart wie Stein." },
        { key: "sonde", icon: "🛰️", title: "Besuch von der Erde", gallery: ["pluto.jpg", "pluto-1.jpg"],
          text: "Das ist ein Modell der Raumsonde New Horizons. Sie war 9½ Jahre unterwegs und flog 2015 ganz nah an Pluto vorbei. Erst durch ihre Fotos wissen wir, wie Pluto aussieht – vorher war er nur ein unscharfer Punkt." },
        { key: "wegweiser", icon: "🪧", title: "Am Rand des Sonnensystems",
          text: "Pluto ist fast 40-mal so weit von der Sonne entfernt wie die Erde: 5,9 Milliarden Kilometer. Darum ist es hier eiskalt – etwa −230 °C. Selbst am Mittag ist es nur so hell wie bei uns in der Dämmerung." }
      ],
      stations: {
        wand:      { label: "Wusstest du?", action: "📋 Meine Entdeckungen lesen", info: true, reach: 6.5 },
        waage:     { label: "Waage", hint: "Stell dich auf die Waage", action: "⚖️ Auf die Waage stellen" },
        charon:    { label: "Fernrohr", hint: "Schau durch das Fernrohr", action: "🔭 Durchschauen" },
        herz:      { label: "Kameradrohne", hint: "Steig mit der Kameradrohne auf", action: "🚁 Mit der Drohne aufsteigen" },
        funk:      { label: "Funk-Antenne", hint: "Schick einen Funkspruch zur Erde", action: "📡 Funkspruch zur Erde schicken" },
        jahr:      { label: "Planeten-Rennen", hint: "Geh zur Plutostation und starte das Planeten-Rennen", action: "🏁 Planeten-Rennen ansehen" },
        groesse:   { label: "Größenvergleich", hint: "Geh zur Plutostation und schau dir die Kugeln an", action: "📏 Größe schätzen" },
        eis:       { label: "Eisfläche", hint: "Lauf geradeaus zur großen hellen Eisfläche", again: "⛸️ Nochmal ansehen", small: true, reach: 8 },
        sonde:     { label: "Raumsonde", hint: "Such ein goldenes Licht hinter deiner Rakete", again: "🛰️ Nochmal ansehen", small: true, auto: 2.8 },
        wegweiser: { label: "Wegweiser", hint: "Such ein goldenes Licht nahe bei deiner Rakete", again: "🪧 Nochmal ansehen", small: true, auto: 2.6 },
        rakete:    { label: "Deine Rakete", action: "🚀 Einsteigen", home: true }
      },
      weigh: {
        text: "Stell ein, wie viel du auf der Erde wiegst: {erde} Kilo. Hier auf Pluto zeigt die Waage nur {mond} Kilo!",
        less: "➖ leichter", more: "➕ schwerer", done: "Fertig ✓"
      },
      charon: {
        aim: "Pluto hat einen riesigen Mond: Charon. Such ihn! Zieh mit der Maus über den Himmel oder nimm die Pfeiltasten.",
        aimTouch: "Pluto hat einen riesigen Mond: Charon. Such ihn! Wische über den Himmel, um das Fernrohr zu schwenken.",
        hint: "Tipp der Bodenstation: Charon ist in dieser Richtung",
        almost: "Fast! Halte das Fernrohr genau auf Charon.",
        found: "Gefunden! Das ist Charon. Er ist halb so breit wie Pluto – so einen großen Mond hat sonst kein Planet.",
        compareBtn: "🌕 Mit unserem Mond vergleichen",
        compare: "Die kleine Kugel daneben: So sehen wir unseren Mond von der Erde. Charon wirkt am Pluto-Himmel 7-mal so groß!",
        sunBtn: "☀️ Zur Sonne schwenken",
        sun: "Dieser helle Stern ist unsere Sonne! Pluto ist so weit weg, dass sie nur noch wie ein sehr heller Stern aussieht.",
        done: "Fertig ✓"
      },
      drone: {
        rising: "Die Kameradrohne steigt auf … Schau dir die helle Fläche dort hinten an!",
        top: "Siehst du es? Die helle Eisfläche hat die Form eines Herzens!",
        done: "Landen ✓"
      },
      signal: {
        ready: "Wir funken zur Erde: „Hallo von Pluto!“ Die Antenne zeigt zur Sonne, denn die Erde steht von hier aus ganz dicht daneben. Achtung …",
        run: "Der Funkspruch rast mit Lichtgeschwindigkeit los … schon unterwegs seit",
        end: "Angekommen – nach 5½ Stunden! Und die Antwort von der Erde braucht noch einmal so lange.",
        again: "📡 Nochmal", done: "Fertig ✓"
      },
      orrery: {
        ready: "Die Erde (innen) und Pluto (außen) laufen um die Sonne. Wer braucht länger für eine Runde? Starte das Rennen!",
        go: "🏁 Rennen starten",
        run: "Erdjahre: {erde} · Pluto hat sich kaum bewegt …",
        end: "Die Erde ist 12-mal um die Sonne gelaufen – Pluto hat nur ein winziges Stück geschafft. Für eine ganze Runde braucht er 248 Erdjahre!",
        again: "🏁 Nochmal", done: "Fertig ✓"
      },
      guess: {
        q: "Was ist größer: Pluto oder unser Mond?", a: ["Pluto", "Unser Mond"], c: 1,
        right: "Richtig!", wrong: "Nicht ganz.",
        why: "Unser Mond ist größer! Pluto ist nur 2.377 Kilometer breit – darum nennt man ihn Zwergplanet.",
        done: "Fertig ✓"
      },
      radio: {
        start: "Hier ist die Bodenstation! Willkommen auf Pluto, {name}! Hier gibt es {anzahl} Dinge zu entdecken. Die hohen Lichtsäulen zeigen dir die Stationen, die kleinen goldenen Lichter sind Fundstücke. An der Wand der Plutostation erscheint alles, was du entdeckt hast. Probier zuerst mal zu springen – du wirst staunen!",
        found: "Klasse Entdeckung! Noch {rest} übrig.",
        back: "Willkommen zurück auf Pluto, {name}! Dir fehlen noch {rest} Entdeckungen – folge den Lichtern. Tipps findest du oben rechts bei der Lupe.",
        allFound: "Fantastisch, {name}! Du hast alles entdeckt. Die Bodenstation hat noch {fragen} Fragen an dich.",
        tooFar: "Bodenstation an {name}: Bitte entferne dich nicht zu weit von der Rakete!",
        quizDone: "Mission erfüllt! Wenn du fertig bist, lauf zurück zu deiner Rakete und steig über die Leiter ein – oder erkunde noch ein bisschen."
      },
      quiz: [
        { q: "Warum rutschst du auf Plutos Herz?", a: ["Es ist glattes Eis aus gefrorenem Stickstoff", "Es ist nasser Schlamm", "Es ist poliertes Metall"], c: 0, why: "Bei −230 °C gefriert sogar Stickstoff – das Gas aus unserer Luft – zu glattem Eis." },
        { q: "Wie lange braucht ein Funkspruch von Pluto bis zur Erde?", a: ["1 Sekunde", "8 Minuten", "5½ Stunden"], c: 2, why: "Pluto ist 5,9 Milliarden Kilometer entfernt – selbst Licht braucht dafür Stunden." },
        { q: "Wie sieht die Sonne von Pluto aus?", a: ["Riesig", "Wie ein sehr heller Stern", "Man sieht sie gar nicht"], c: 1, why: "Pluto ist fast 40-mal so weit von der Sonne weg wie die Erde." }
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
