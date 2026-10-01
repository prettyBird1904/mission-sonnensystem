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
  version: "14",

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
      // Lea empfängt das Kind: erst die Landestelle von 1969, dann hinauf auf den Kraterrand, hinab in den Krater und zur Basis
      guide: {
        npc: 0, order: ["sprung", "wegweiser", "waage", "apollo", "fallversuch", "spiegel", "temperatur", "himmel", "mondstein", "antenne"],
        hello: "Hallo {name}! Bleib kurz bei deiner Rakete, ich komme zu dir!",
        welcome: "Willkommen auf dem Mond! Ich bin Lea und leite die Mondbasis. Heute zeige ich dir einen ganzen Rundgang: alte Spuren, einen riesigen Krater und unsere Basis. Spring zuerst mal – aber vorsichtig!",
        jump: "Na los, spring! Hier wiegst du fast nichts.",
        wait: "Hier lang, {name}! Ich warte auf dich.",
        next: "Toll! Komm mit – als Nächstes: {ziel}.",
        arrive: {
          wegweiser: "Siehst du den Wegweiser? Lauf ganz nah heran – er verrät dir, wie weit es nach Hause ist.",
          waage: "Hier wird die Fracht gewogen, die der Frachtlander bringt. Stell dich mal selbst auf die Waage!",
          apollo: "Psst – das ist ein besonderer Ort. Hier sind 1969 zum ersten Mal Menschen auf dem Mond gelandet. Lauf an der Absperrung entlang!",
          fallversuch: "Hier hat ein Astronaut einen berühmten Versuch gemacht: Was fällt schneller – ein Hammer oder eine Feder? Probier es aus!",
          spiegel: "Diesen Spiegel haben die Apollo-Astronauten aufgestellt. Gleich schickt die Erde einen Laserstrahl – stopp die Zeit mit!",
          temperatur: "Stell dich mal in den Schatten von dem großen Felsen und schau auf dein Thermometer!",
          himmel: "Willkommen auf dem Kraterrand! Von der Plattform „Erdblick“ aus siehst du unsere Erde. Schau durchs Fernrohr!",
          mondstein: "Wir sind unten im Krater. Hier liegt etwas Besonderes im Staub – such das glitzernde Fundstück!",
          antenne: "Das ist unsere Funkstation. Ihre Schüssel zeigt immer zur Erde. Spul mal die Zeit vor – was macht die Erde?",
          wand: "Das ist unsere Mondbasis! An der Wand siehst du alles, was du entdeckt hast.",
          rakete: "Hier ist deine Rakete. Steig über die Leiter ein, wenn du weiterfliegen willst. Gute Reise, {name}!"
        },
        quiz: "Du hast alles entdeckt! Komm mit zur Mondbasis – die Bodenstation funkt dir ein paar Fragen.",
        home: "Super gemacht, {name}! Ich bringe dich zurück zu deiner Rakete.",
        alone: "Alles klar, erkunde allein! Wenn du mich brauchst, komm einfach zu mir.",
        again: "🧭 Lea, zeig mir den Weg"
      },
      // Bewohner der Mondbasis (Ideen von ESA und NASA für eine echte Basis am Südpol des Mondes)
      npcs: [
        { name: "Kommandantin Lea", color: "#3b82f6", path: [[30, 38], [40, 34], [36, 28], [26, 32]],
          hello: "Hallo {name}! Ich bin Lea und leite die Mondbasis. Willkommen auf dem Mond!",
          hint: "Warst du schon bei „{ziel}“? Der Pfeil oben zeigt dir den Weg!",
          done: "Du hast alles entdeckt – toll! Jetzt kennst du den Mond besser als die meisten Erdlinge.",
          facts: ["Unsere Kuppeln sind mit Mondstaub bedeckt. Der dicke Staub schützt uns vor Strahlung und kleinen Meteoriten.",
            "In den dunklen Kratern am Südpol des Mondes liegt Eis. Daraus machen wir Wasser – und sogar Luft zum Atmen.",
            "Die Solartürme sind so hoch, weil die Sonne hier am Südpol immer ganz tief über dem Horizont steht."] },
        { name: "Ingenieur Tom", color: "#f59e0b", path: [[60, 66], [68, 66]], work: true,
          hello: "Hi {name}, ich bin Tom! Siehst du den großen Drucker? Er baut gerade eine neue Kuppel.",
          hint: "Tipp: Probier mal „{ziel}“ aus!",
          done: "Alles entdeckt? Super! Vergiss nicht, zur Rakete zurückzulaufen.",
          facts: ["Der Drucker baut die Kuppel Schicht für Schicht aus Mondstaub. So müssen wir kein Baumaterial von der Erde mitbringen.",
            "Mondstaub ist scharfkantig wie winzige Glassplitter. Darum putzen wir unsere Anzüge nach jedem Ausflug gründlich.",
            "Der Frachtlander bringt uns Nachschub von der Erde. Die Reise dauert etwa drei Tage."] }
      ],
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
        apollo:      { label: "Landestelle von 1969", hint: "Geh zur Mondfähre hinter der Absperrung", again: "👣 Nochmal ansehen", reach: 6 },
        himmel:      { label: "Erdblick", hint: "Schau vom Aussichtsturm „Erdblick“ durchs Fernrohr", action: "🔭 Durchschauen" },
        temperatur:  { label: "Schatten am Felsen", hint: "Stell dich in den Schatten des großen Felsens", again: "🌡️ Nochmal ansehen", reach: 5 },
        fallversuch: { label: "Hammer & Feder", hint: "Probier den berühmten Versuch an der Apollo-Landestelle aus", action: "🪶 Hammer & Feder fallen lassen" },
        waage:       { label: "Frachtwaage", hint: "Stell dich auf die Frachtwaage am Frachtlander", action: "⚖️ Auf die Waage stellen" },
        wegweiser:   { label: "Wegweiser", hint: "Such ein ✨ nahe bei deiner Rakete", again: "🪧 Nochmal ansehen", small: true, auto: 2.6 },
        // Tafelwand der Mondstation: keine Entdeckung (info), öffnet die Liste „Meine Entdeckungen“
        wand:        { label: "Wusstest du?", action: "📋 Meine Entdeckungen lesen", info: true, reach: 6.5 },
        // Exponate auf dem Platz vor der Mondstation
        antenne:     { label: "Funkstation", hint: "Die Funkstation steht vor der Mondbasis", action: "⏩ Zeit vorspulen" },
        spiegel:     { label: "Laser-Spiegel", hint: "Den Laser-Spiegel haben die Apollo-Astronauten neben ihrer Fähre aufgestellt", action: "🔦 Laser-Messung starten" },
        mondstein:   { label: "Mondstein im Krater", hint: "Such ein ✨ unten im großen Krater", again: "🪨 Nochmal ansehen", small: true, auto: 2.6 },
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
        start: "Hier ist die Bodenstation! Willkommen auf dem Mond, {name}! Hier gibt es {anzahl} Dinge zu entdecken. Die schwebenden Symbole zeigen dir die Stationen, ein ✨ ist ein Fundstück – und der Pfeil oben führt dich zur nächsten Entdeckung. An der Wand der Mondbasis erscheint alles, was du entdeckt hast. Probier doch zuerst mal zu springen!",
        found: "Klasse Entdeckung! Noch {rest} übrig.",
        back: "Willkommen zurück auf dem Mond, {name}! Dir fehlen noch {rest} Entdeckungen – folge dem Pfeil oben. Tipps findest du oben rechts bei der Lupe.",
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
      nasa: ["ingenuity", "perseverance"], // echte NASA-Modelle (werden beim ersten Besuch geladen)
      // Mitbewohner des Forschungslagers: laufen ihre Wege ab und sprechen das Kind an, wenn es nahe kommt
      npcs: [
        { name: "Forscherin Mia", color: "#22c55e", path: [[-12, 50], [-12, 58], [-4, 46], [-16, 44]],
          hello: "Hallo {name}! Ich bin Mia und erforsche den Mars. Schön, dass du uns besuchst!",
          hint: "Warst du schon bei „{ziel}“? Der Pfeil oben zeigt dir den Weg!",
          done: "Wow, du hast alles entdeckt! Du bist jetzt ein echter Mars-Profi!",
          facts: ["In unserem Gewächshaus ziehen wir Salat. Draußen würde er sofort erfrieren.",
            "Unsere Luft zum Atmen macht die Sauerstoff-Anlage hinter der Kuppel – aus der Marsluft, die fast nur aus Kohlendioxid besteht.",
            "Siehst du den Wall aus Marsboden um unsere Türme? Er schützt uns vor der Strahlung aus dem All.",
            "Ein Mars-Tag ist nur 37 Minuten länger als bei euch. Da gewöhnt man sich schnell dran!"] },
        { name: "Techniker Ben", color: "#3b82f6", path: [[14, 50], [19, 45], [12, 43]], work: true,
          hello: "Hi {name}, ich bin Ben! Ich halte hier alles in Schuss: Strom, Luft und Wasser.",
          hint: "Tipp von mir: Probier mal „{ziel}“ aus!",
          done: "Alles entdeckt? Klasse! Vergiss nicht, zur Rakete zurückzulaufen.",
          facts: ["Unseren Strom machen die Sonnenkollektoren. Nach einem Staubsturm muss ich sie putzen!",
            "Der Transporter da drüben bringt uns Nachschub – Essen, Werkzeug und Post von der Erde.",
            "Wasser holen wir an der Wasser-Anlage aus dem Eis im Boden. Das schmelzen wir und reinigen es.",
            "Im Gewächshaus bekommen die Pflanzen rosa-lila Licht von Lampen – das mögen sie am liebsten."] }
      ],
      // Mia empfängt das Kind an der Rakete und führt es über die Hochebene hinab ins Tal zum Außenposten
      guide: {
        npc: 0, order: ["sprung", "wegweiser", "vulkan", "monde", "abend", "rover", "teufel", "waage", "rost", "eis"],
        hello: "Hallo {name}! Warte, ich komme zu dir!",
        welcome: "Willkommen auf dem Mars! Ich bin Mia und zeige dir alles. Du stehst auf einer Hochebene – unten im Tal liegt unser Außenposten. Spring doch zuerst mal in die Luft!",
        jump: "Na los, spring! Du wirst staunen, wie leicht das hier geht.",
        wait: "Hier lang, {name}! Ich warte auf dich.",
        next: "Klasse! Komm mit – als Nächstes zeige ich dir: {ziel}.",
        arrive: {
          wegweiser: "Das ist unsere Anzeigetafel. Lauf mal ganz nah heran!",
          vulkan: "Hier steht unser Hubschrauber. Steig mit ihm auf – von oben siehst du etwas Riesiges!",
          monde: "Unsere Sternwarte steht direkt an der Kante. Die Kuppel klappt auf. Der Mars hat zwei Monde – findest du sie?",
          abend: "Das ist unsere Wetterstation. Mit der Himmelskamera spulen wir bis zum Abend vor. Was meinst du: Welche Farbe hat der Sonnenuntergang?",
          rover: "Wir sind unten im Tal! Das ist der Rover-Leitstand. Steuere den Rover zum hellen Stein im alten Flussdelta – dort war früher Wasser!",
          teufel: "Siehst du den Wirbel da draußen? Ein Staubteufel! Lauf hin und fang ihn ein!",
          waage: "Hier ist unser Gesundheits-Check. Stell dich mal auf die Waage!",
          rost: "Willkommen im Proben-Labor! Warum ist der Mars eigentlich rot? Halte den Magneten in den Staub!",
          eis: "Das ist unsere Wasser-Anlage. Bohr mal nach – was liegt unter dem Staub?",
          wand: "An dieser Wand siehst du alles, was du entdeckt hast.",
          rakete: "Hier ist deine Rakete. Steig über die Leiter ein, wenn du weiterfliegen willst. Tschüss, {name} – komm bald wieder!"
        },
        quiz: "Du hast alles entdeckt! Die Bodenstation funkt dir gleich ein paar Fragen – komm mit zur Wand!",
        home: "Super gemacht, {name}! Ich bringe dich zurück zu deiner Rakete.",
        alone: "Alles klar, erkunde allein! Wenn du mich brauchst, komm einfach zu mir.",
        again: "🧭 Mia, zeig mir den Weg"
      },
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
        waage:     { label: "Gesundheits-Check", hint: "Mach den Gesundheits-Check unter dem Vordach am Wohnturm", action: "⚖️ Auf die Waage stellen" },
        rover:     { label: "Rover-Leitstand", hint: "Steuere den Rover vom Leitstand aus – er parkt in der Garage daneben", action: "🤖 Rover fernsteuern" },
        rost:      { label: "Proben-Labor", hint: "Untersuch den Marsstaub im Proben-Labor am Labor-Turm", action: "🧲 Magnet-Versuch starten" },
        vulkan:    { label: "Flugfeld", hint: "Am Flugfeld wartet der Hubschrauber auf dich", action: "🚁 Mit dem Hubschrauber aufsteigen" },
        monde:     { label: "Sternwarte", hint: "Geh in die Sternwarte neben deiner Rakete", action: "🔭 Kuppel öffnen und durchschauen" },
        abend:     { label: "Wetterstation", hint: "An der Wetterstation steht eine Himmelskamera", action: "⏩ Zeit vorspulen bis zum Abend" },
        eis:       { label: "Wasser-Anlage", hint: "Bohr an der Wasser-Anlage nach Eis", action: "⛏️ Bohrer benutzen" },
        teufel:    { label: "Staubteufel", hint: "Fang den Staubteufel – er wirbelt draußen hinter der Wetterstation herum", again: "🌪️ Nochmal ansehen", small: true, auto: 3.2, reach: 4 },
        wegweiser: { label: "Anzeigetafel", hint: "Such ein ✨ am Landeplatz deiner Rakete", again: "🪧 Nochmal ansehen", small: true, auto: 2.6 },
        rakete:    { label: "Deine Rakete", action: "🚀 Einsteigen", home: true }
      },
      weigh: {
        text: "Stell ein, wie viel du auf der Erde wiegst: {erde} Kilo. Hier auf dem Mars zeigt die Waage nur {mond} Kilo!",
        less: "➖ leichter", more: "➕ schwerer", done: "Fertig ✓"
      },
      rover: {
        drive: "Steuere den Rover mit W, A, S, D zum hellen Stein mit dem gelben Ring!",
        driveTouch: "Steuere den Rover mit dem Joystick zum hellen Stein mit dem gelben Ring!",
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
        start: "Hier ist die Bodenstation! Willkommen auf dem Mars, {name}! Hier gibt es {anzahl} Dinge zu entdecken. Die schwebenden Symbole zeigen dir die Stationen, ein ✨ ist ein Fundstück – und der Pfeil oben führt dich zur nächsten Entdeckung. Jede Aufgabe gehört zu einem Gebäude des Außenpostens, und an der Wand der Marsstation erscheint alles, was du entdeckt hast. Probier doch zuerst mal zu springen!",
        found: "Klasse Entdeckung! Noch {rest} übrig.",
        back: "Willkommen zurück auf dem Mars, {name}! Dir fehlen noch {rest} Entdeckungen – folge dem Pfeil oben. Tipps findest du oben rechts bei der Lupe.",
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
      // Kofi führt erst durch die glühende Sonne oben, dann hinab in den Krater, in dem die Station im Schatten liegt
      guide: {
        npc: 0, order: ["sprung", "wegweiser", "sonde", "waage", "sonne", "temperatur", "eis", "jahr", "groesse", "krater"],
        hello: "Hallo {name}! Schnell aus der Sonne – ich hole dich ab!",
        welcome: "Willkommen auf dem Merkur! Ich bin Kofi. Unsere Station liegt unten in einem Krater, wo nie die Sonne hinkommt. Vorher zeige ich dir, wie heiß es oben ist. Spring erst mal!",
        jump: "Na los, spring! Der Merkur ist klein, aber er zieht trotzdem ganz ordentlich.",
        wait: "Hier lang, {name}! Ich warte auf dich.",
        next: "Klasse! Weiter geht's – als Nächstes: {ziel}.",
        arrive: {
          wegweiser: "Lauf mal zur Anzeigetafel – wie weit ist die Sonne wohl weg?",
          sonde: "Hier liegen die Reste einer Raumsonde. Lauf ganz nah heran!",
          waage: "Im Schatten-Platz steht unsere Waage. Ohne das Dach wäre sie in der Sonne glühend heiß. Stell dich drauf!",
          sonne: "Oben auf dem Sonnenturm steht ein Fernrohr mit dunklem Filter. Schau, wie riesig die Sonne von hier aus ist!",
          temperatur: "Stell dich in den Schatten von dem großen Felsen und schau auf dein Thermometer!",
          eis: "Wir sind unten im Krater. Hierhin kommt nie ein Sonnenstrahl. Siehst du das Glitzern? Lauf hin!",
          jahr: "Hier kannst du ein Rennen um die Sonne starten: Merkur gegen Erde. Wer gewinnt?",
          groesse: "Schau dir die Kugeln an: Wie groß ist der Merkur eigentlich?",
          krater: "Zum Schluss das Einschlag-Messfeld! Lass einen Brocken aus dem All fallen und schau, was passiert.",
          wand: "An der Wand unserer Station siehst du alles, was du entdeckt hast.",
          rakete: "Hier ist deine Rakete. Steig über die Leiter ein, wenn du weiterfliegen willst. Gute Reise, {name}!"
        },
        quiz: "Du hast alles entdeckt! Komm mit zur Station – die Bodenstation hat ein paar Fragen an dich.",
        home: "Super gemacht, {name}! Ich bringe dich zurück zu deiner Rakete.",
        alone: "Alles klar, erkunde allein! Wenn du mich brauchst, komm einfach zu mir.",
        again: "🧭 Kofi, zeig mir den Weg"
      },
      npcs: [
        { name: "Forscher Kofi", color: "#b45309", path: [[-6, 58], [6, 56], [2, 52]],
          hello: "Hallo {name}! Ich bin Kofi. Gut, dass du einen Raumanzug trägst – in der Sonne ist es hier heißer als in einem Backofen!",
          hint: "Warst du schon bei „{ziel}“? Der Pfeil oben zeigt dir den Weg!",
          done: "Du hast alles entdeckt! Jetzt weißt du mehr über den Merkur als fast alle Menschen.",
          facts: ["Siehst du den großen weißen Schild? Er wirft Schatten auf unsere Station. Ohne ihn würde sie in der Sonne glühend heiß.",
            "Die weißen Rippen sind Kühler. Sie strahlen die Wärme aus unserer Station ins All ab.",
            "Von einem Sonnenaufgang bis zum nächsten vergehen hier 176 Erdtage. Ein Tag auf dem Merkur ist länger als sein Jahr!",
            "Der Merkur hat einen riesigen Kern aus Eisen – fast wie eine Kanonenkugel mit einer dünnen Schale aus Stein."] }
      ],
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
          text: "Das sind die Reste der Raumsonde MESSENGER. Sie umkreiste den Merkur von 2011 bis 2015 und hat ihn komplett fotografiert. Als ihr Treibstoff aufgebraucht war, stürzte sie wirklich auf den Merkur und schlug einen kleinen Krater. Eine Reise zum Merkur ist schwierig: Die Sonne zieht so stark, dass eine Sonde ständig bremsen muss. Die nächste Sonde heißt BepiColombo und ist schon unterwegs." },
        { key: "wegweiser", icon: "🪧", title: "Ganz nah an der Sonne",
          text: "Der Merkur ist der erste Planet. Bis zur Sonne sind es nur 58 Millionen Kilometer. Das Sonnenlicht braucht gut 3 Minuten bis hierher – bis zur Erde braucht es 8 Minuten." }
      ],
      stations: {
        wand:       { label: "Wusstest du?", action: "📋 Meine Entdeckungen lesen", info: true, reach: 6.5 },
        waage:      { label: "Schatten-Platz", hint: "Die Waage steht unter dem Sonnenschutz-Dach", action: "⚖️ Auf die Waage stellen" },
        temperatur: { label: "Schatten am Felsen", hint: "Stell dich in den Schatten des großen Felsens", again: "🌡️ Nochmal ansehen", reach: 5 },
        sonne:      { label: "Sonnenturm", hint: "Oben auf dem Sonnenturm steht ein Fernrohr mit Sonnenfilter", action: "🔭 Durchschauen" },
        krater:     { label: "Einschlag-Messfeld", hint: "Probier den Einschlag-Versuch am Messpult aus", action: "☄️ Einschlag-Versuch starten" },
        jahr:       { label: "Planeten-Rennen", hint: "Geh zur Merkurstation und starte das Planeten-Rennen", action: "🏁 Planeten-Rennen ansehen" },
        groesse:    { label: "Größenvergleich", hint: "Geh zur Merkurstation und schau dir die Kugeln an", action: "📏 Größe schätzen" },
        eis:        { label: "Eis im Krater", hint: "Such ein ✨ unten im Krater, wo nie die Sonne hinscheint", again: "🧊 Nochmal ansehen", small: true, auto: 2.8 },
        sonde:      { label: "Absturzstelle", hint: "Such ein ✨ hinter deiner Rakete – dort liegt eine abgestürzte Raumsonde", again: "🛰️ Nochmal ansehen", small: true, auto: 2.8 },
        wegweiser:  { label: "Anzeigetafel", hint: "Such ein ✨ nahe bei deiner Rakete", again: "🪧 Nochmal ansehen", small: true, auto: 2.6 },
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
        start: "Hier ist die Bodenstation! Willkommen auf dem Merkur, {name}! Hier gibt es {anzahl} Dinge zu entdecken. Die schwebenden Symbole zeigen dir die Stationen, ein ✨ ist ein Fundstück – und der Pfeil oben führt dich zur nächsten Entdeckung. An der Wand der Merkurstation erscheint alles, was du entdeckt hast. Schau mal, wie riesig die Sonne ist!",
        found: "Klasse Entdeckung! Noch {rest} übrig.",
        back: "Willkommen zurück auf dem Merkur, {name}! Dir fehlen noch {rest} Entdeckungen – folge dem Pfeil oben. Tipps findest du oben rechts bei der Lupe.",
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
      guide: {
        npc: 0, order: ["sprung", "wegweiser", "waage", "charon", "herz", "eis", "jahr", "groesse", "funk", "sonde"],
        hello: "Hallo {name}! Willkommen am Rand des Sonnensystems! Bleib stehen, ich komme zu dir.",
        welcome: "Ich bin Yuki. Hier auf Pluto ist es so kalt, dass sogar die Luft gefroren ist! Ich zeige dir die Eisberge, das riesige Herz und unsere Station. Spring zuerst mal – aber halt dich fest!",
        jump: "Na los, spring! Pluto ist so klein, dass du richtig hoch fliegst.",
        wait: "Hier lang, {name}! Ich warte auf dich.",
        next: "Toll! Weiter geht's – als Nächstes: {ziel}.",
        arrive: {
          wegweiser: "Lauf zur Anzeigetafel – wie weit sind wir wohl von der Sonne weg?",
          waage: "Im Wärme-Pavillon steht unsere Waage. Stell dich drauf – du wirst lachen!",
          charon: "Unsere Iglu-Sternwarte ist aus Eisblöcken gebaut. Schau durchs Fernrohr: Da hängt ein großer Mond am Himmel!",
          herz: "Am Drohnen-Start wartet unsere Kameradrohne. Flieg hoch und schau dir die Eisfläche von oben an!",
          eis: "Jetzt du! Lauf auf das glatte Eis – aber pass auf, es ist rutschig!",
          jahr: "Hier kannst du ein Rennen um die Sonne starten: Pluto gegen Erde. Rate mal, wer gewinnt!",
          groesse: "Schau dir die Kugeln an: Wie groß ist Pluto im Vergleich?",
          funk: "Mit der großen Antenne funken wir zur Erde. Schick einen Funkspruch – und miss, wie lange er braucht!",
          sonde: "Hier steht ein Denkmal für eine berühmte Raumsonde. Lauf ganz nah heran!",
          wand: "An der Wand unserer Station siehst du alles, was du entdeckt hast.",
          rakete: "Hier ist deine Rakete. Gute Reise, {name} – der Weg nach Hause ist lang!"
        },
        quiz: "Du hast alles entdeckt! Komm mit zur Station – die Bodenstation hat Fragen an dich.",
        home: "Super gemacht, {name}! Ich bringe dich zurück zu deiner Rakete.",
        alone: "Alles klar, erkunde allein! Wenn du mich brauchst, komm einfach zu mir.",
        again: "🧭 Yuki, zeig mir den Weg"
      },
      npcs: [
        { name: "Forscherin Yuki", color: "#8b5cf6", path: [[-40, 44], [-30, 44], [-34, 38]],
          hello: "Hallo {name}! Ich bin Yuki. Willkommen am kältesten Ort, den du je besucht hast!",
          hint: "Warst du schon bei „{ziel}“? Der Pfeil oben zeigt dir den Weg!",
          done: "Du hast alles entdeckt – bis zum Rand des Sonnensystems! Toll gemacht.",
          facts: ["Unser Strom kommt aus Atom-Batterien. Das Sonnenlicht ist hier viel zu schwach – so hell wie bei euch in der Dämmerung.",
            "Die Berge da hinten sind aus Wassereis. Bei −230 °C ist Eis so hart wie Stein – und die Berge sind über 3 Kilometer hoch.",
            "Siehst du den blauen Dunst am Horizont? Pluto hat eine ganz dünne Lufthülle, die im Sonnenlicht blau schimmert.",
            "Das Herz ist voller Zellen, wie Waben. Darin wird das Stickstoff-Eis ganz langsam umgewälzt – wie Suppe in einem Topf."] }
      ],
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
          text: "Das ist ein Nachbau der Raumsonde New Horizons. Sie war 9½ Jahre unterwegs und flog 2015 ganz nah an Pluto vorbei. Erst durch ihre Fotos wissen wir, wie Pluto aussieht – vorher war er nur ein unscharfer Punkt." },
        { key: "wegweiser", icon: "🪧", title: "Am Rand des Sonnensystems",
          text: "Pluto ist fast 40-mal so weit von der Sonne entfernt wie die Erde: 5,9 Milliarden Kilometer. Darum ist es hier eiskalt – etwa −230 °C. Selbst am Mittag ist es nur so hell wie bei uns in der Dämmerung." }
      ],
      stations: {
        wand:      { label: "Wusstest du?", action: "📋 Meine Entdeckungen lesen", info: true, reach: 6.5 },
        waage:     { label: "Wärme-Pavillon", hint: "Die Waage steht im beheizten Wärme-Pavillon", action: "⚖️ Auf die Waage stellen" },
        charon:    { label: "Iglu-Sternwarte", hint: "Schau in der Iglu-Sternwarte durchs Fernrohr", action: "🔭 Durchschauen" },
        herz:      { label: "Drohnen-Start", hint: "Steig am Drohnen-Landeplatz mit der Kameradrohne auf", action: "🚁 Mit der Drohne aufsteigen" },
        funk:      { label: "Große Antenne", hint: "Schick an der großen Antenne einen Funkspruch zur Erde", action: "📡 Funkspruch zur Erde schicken" },
        jahr:      { label: "Planeten-Rennen", hint: "Geh zur Plutostation und starte das Planeten-Rennen", action: "🏁 Planeten-Rennen ansehen" },
        groesse:   { label: "Größenvergleich", hint: "Geh zur Plutostation und schau dir die Kugeln an", action: "📏 Größe schätzen" },
        eis:       { label: "Eisfläche", hint: "Lauf auf die große helle Eisfläche, das Herz", again: "⛸️ Nochmal ansehen", small: true, reach: 8 },
        sonde:     { label: "New Horizons", hint: "Such ein ✨ hinter deiner Rakete – dort steht ein Denkmal", again: "🛰️ Nochmal ansehen", small: true, auto: 2.8 },
        wegweiser: { label: "Anzeigetafel", hint: "Such ein ✨ nahe bei deiner Rakete", again: "🪧 Nochmal ansehen", small: true, auto: 2.6 },
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
        start: "Hier ist die Bodenstation! Willkommen auf Pluto, {name}! Hier gibt es {anzahl} Dinge zu entdecken. Die schwebenden Symbole zeigen dir die Stationen, ein ✨ ist ein Fundstück – und der Pfeil oben führt dich zur nächsten Entdeckung. An der Wand der Plutostation erscheint alles, was du entdeckt hast. Probier zuerst mal zu springen – du wirst staunen!",
        found: "Klasse Entdeckung! Noch {rest} übrig.",
        back: "Willkommen zurück auf Pluto, {name}! Dir fehlen noch {rest} Entdeckungen – folge dem Pfeil oben. Tipps findest du oben rechts bei der Lupe.",
        allFound: "Fantastisch, {name}! Du hast alles entdeckt. Die Bodenstation hat noch {fragen} Fragen an dich.",
        tooFar: "Bodenstation an {name}: Bitte entferne dich nicht zu weit von der Rakete!",
        quizDone: "Mission erfüllt! Wenn du fertig bist, lauf zurück zu deiner Rakete und steig über die Leiter ein – oder erkunde noch ein bisschen."
      },
      quiz: [
        { q: "Warum rutschst du auf Plutos Herz?", a: ["Es ist glattes Eis aus gefrorenem Stickstoff", "Es ist nasser Schlamm", "Es ist poliertes Metall"], c: 0, why: "Bei −230 °C gefriert sogar Stickstoff – das Gas aus unserer Luft – zu glattem Eis." },
        { q: "Wie lange braucht ein Funkspruch von Pluto bis zur Erde?", a: ["1 Sekunde", "8 Minuten", "5½ Stunden"], c: 2, why: "Pluto ist 5,9 Milliarden Kilometer entfernt – selbst Licht braucht dafür Stunden." },
        { q: "Wie sieht die Sonne von Pluto aus?", a: ["Riesig", "Wie ein sehr heller Stern", "Man sieht sie gar nicht"], c: 1, why: "Pluto ist fast 40-mal so weit von der Sonne weg wie die Erde." }
      ]
    },

    venus: {
      gravity: 8.87, jump: 0.13,
      temp: { sun: 465, shade: 465, sunText: "🔥 Überall glühend heiß!", shadeText: "🔥 Auch im Schatten glühend heiß!" },
      // Sara kommt (wie das Kind) im Panzeranzug aus dem Luftschiff herunter und führt entlang der Leitlichter
      npcs: [
        { name: "Pilotin Sara", color: "#f97316", path: [[-20, 64], [-8, 64], [-14, 60]],
          hello: "Hallo {name}! Hier ist Sara. Ich sehe dich kaum im Dunst – bleib stehen, ich komme!",
          hint: "Warst du schon bei „{ziel}“? Folge den Leitlichtern!",
          done: "Du hast alles entdeckt! Jetzt kennst du den heißesten Planeten.",
          facts: ["Wir wohnen oben im Luftschiff, 50 Kilometer hoch in den Wolken. Dort ist es so warm wie in einem Zimmer!",
            "Unsere Anzüge sind wie kleine Panzer. Ohne sie würde uns die dicke Luft zerquetschen.",
            "Die Lichter am Weg brauchen wir, weil man im Dunst kaum 100 Meter weit sieht."] }
      ],
      guide: {
        npc: 0, order: ["sprung", "wegweiser", "venera", "waage", "hitze", "druck", "lava", "abendstern", "tag", "groesse"],
        hello: "Hallo {name}! Hier ist Sara. Ich sehe dich kaum im Dunst – bleib stehen, ich komme!",
        welcome: "Willkommen auf der Venus! Ich bin Sara und wie du im Spezialanzug unterwegs. Siehst du die Leitlichter? Sie führen uns durch den Dunst bis zum Außenposten auf dem Vulkan. Spring erst mal – merkst du was?",
        jump: "Spring mal! Mit dem schweren Anzug kommst du kaum vom Boden weg.",
        wait: "Hier lang, {name}! Folge den Lichtern zu mir.",
        next: "Gut gemacht! Weiter an den Leitlichtern entlang – als Nächstes: {ziel}.",
        arrive: {
          wegweiser: "Lauf mal zur Anzeigetafel – wie heiß ist es hier?",
          venera: "Da steht eine alte Landesonde aus dem Jahr 1982. Lauf ganz nah heran!",
          waage: "Hier steht eine Waage. Wie viel wiegst du wohl auf der Venus?",
          hitze: "Das ist der Klima-Messturm. Was passiert wohl, wenn wir die Wolken wegschieben?",
          druck: "Am Druck-Prüfstand siehst du, wie stark die Venusluft drückt. Achtung, gleich knirscht es!",
          lava: "Vorsicht – ein Lavafluss! Wir gehen über die Brücke. Schau dir das Glühen an!",
          abendstern: "Mit Radar und Infrarot schauen wir durch die Wolken. Such die Erde am Himmel!",
          tag: "Hier drehen sich zwei Globen: Erde und Venus. Wer ist schneller?",
          groesse: "Schau dir die Kugeln an: Ist die Venus größer oder kleiner als die Erde?",
          wand: "Das ist unser Außenposten auf dem Vulkan. An der Wand siehst du alles, was du entdeckt hast.",
          rakete: "Hier ist deine Rakete. Gute Reise, {name} – und raus aus der Hitze!"
        },
        quiz: "Du hast alles entdeckt! Komm zur Wand vom Außenposten – die Bodenstation hat Fragen an dich.",
        home: "Super gemacht, {name}! Ich bringe dich zurück zu deiner Rakete.",
        alone: "Alles klar, erkunde allein! Folge einfach den Leitlichtern. Wenn du mich brauchst, komm zu mir.",
        again: "🧭 Sara, zeig mir den Weg"
      },
      discoveries: [
        { key: "sprung", icon: "🦘", title: "Fast wie zu Hause", hint: "Spring mal in die Luft!", fallback: { hoehe: "etwa 13 Zentimeter", zeit: "0,3" },
          text: "Nur {hoehe} – mit dem schweren Spezialanzug kommst du kaum vom Boden weg! Die Venus ist fast so groß wie die Erde und zieht fast genauso stark an dir. Man nennt sie deshalb auch die Schwester der Erde." },
        { key: "waage", icon: "⚖️", title: "Fast dein Gewicht", fallback: { erde: "30", mond: "27,1" },
          text: "Auf der Erde wiegst du {erde} Kilo – hier zeigt die Waage {mond} Kilo. Das ist fast dasselbe! Die Venus ist nur ein kleines bisschen kleiner als die Erde." },
        { key: "hitze", icon: "🌡️", title: "Der heißeste Planet",
          text: "Auf der Venus ist es 465 °C heiß – heißer als auf dem Merkur, obwohl der viel näher an der Sonne ist! Schuld sind die dicken Wolken: Das Sonnenlicht kommt herein, aber die Wärme kommt nicht mehr hinaus – wie unter einer dicken Decke. Man nennt das Treibhauseffekt. Ohne die Wolken wäre es hier viel kühler." },
        { key: "druck", icon: "🥫", title: "Zerquetscht!",
          text: "Die Venusluft ist so dicht, dass sie 90-mal so stark drückt wie die Luft auf der Erde. So stark drückt bei uns das Wasser in 900 Metern Meerestiefe! Ohne deinen Spezialanzug würde es dir gehen wie der Blechdose. Die Wolken bestehen außerdem aus giftiger Säure." },
        { key: "tag", icon: "🔄", title: "Ein Tag länger als ein Jahr",
          text: "Die Venus dreht sich unglaublich langsam: Für eine einzige Drehung braucht sie 243 Erdtage. Für eine Runde um die Sonne braucht sie nur 225 Erdtage – ein Tag ist dort also länger als ein Jahr! Außerdem dreht sie sich andersherum als die Erde: Auf der Venus geht die Sonne im Westen auf." },
        { key: "groesse", icon: "📏", title: "Die Schwester der Erde",
          text: "Die Venus ist 12.104 Kilometer breit – die Erde 12.742 Kilometer. Die beiden sind fast gleich groß! Einen Mond hat die Venus nicht." },
        { key: "abendstern", icon: "✨", title: "Der Abendstern",
          text: "Von der Venus aus wäre die Erde ein heller blauer Punkt. Und umgekehrt? Von der Erde aus ist die Venus der hellste Punkt am ganzen Himmel – heller als jeder Stern! Man sieht sie abends oder morgens und nennt sie deshalb Abendstern oder Morgenstern. Ihre Wolken werfen das Sonnenlicht besonders gut zurück." },
        { key: "venera", icon: "🛰️", title: "Zwei Stunden auf der Venus", photo: "venus-1.jpg",
          text: "Das ist die Landesonde Venera 13 aus Russland. 1982 landete sie auf der Venus und funkte dieses Foto zur Erde – es zeigt wirklich den Boden der Venus! Nach etwa 2 Stunden gab die Sonde auf: Hitze und Druck waren zu stark." },
        { key: "lava", icon: "🌋", title: "Land der Vulkane",
          text: "Glühende Lava! Auf der Venus gibt es mehr Vulkane als auf jedem anderen Planeten – viele Tausend. Fast der ganze Boden besteht aus erkalteter Lava. Forscher glauben, dass einige Vulkane heute noch ausbrechen." },
        { key: "wegweiser", icon: "🪧", title: "Der zweite Planet",
          text: "Die Venus ist der zweite Planet. Bis zur Sonne sind es 108 Millionen Kilometer. Von allen Planeten kommt sie der Erde am nächsten – trotzdem könnte dort kein Mensch leben." }
      ],
      stations: {
        wand:       { label: "Wusstest du?", action: "📋 Meine Entdeckungen lesen", info: true, reach: 6.5 },
        waage:      { label: "Waage", hint: "Stell dich auf die Waage", action: "⚖️ Auf die Waage stellen" },
        hitze:      { label: "Klima-Messturm", hint: "Probier den Wolken-Versuch am Klima-Messturm aus", action: "☁️ Wolken-Versuch starten" },
        druck:      { label: "Druck-Prüfstand", hint: "Probier den Druck-Versuch am Druck-Prüfstand aus", action: "🥫 Druck-Versuch starten" },
        tag:        { label: "Dreh-Vergleich", hint: "Geh zum Außenposten und lass die Globen drehen", action: "🔄 Globen drehen lassen" },
        groesse:    { label: "Größenvergleich", hint: "Geh zum Außenposten und schau dir die Kugeln an", action: "📏 Größe schätzen" },
        abendstern: { label: "Radar & Infrarot", hint: "Schau durch das Spezial-Fernrohr neben der Radarschüssel", action: "🔭 Durchschauen" },
        venera:     { label: "Venera 13", hint: "Such ein ✨ hinter deiner Rakete – dort steht eine alte Landesonde", again: "🛰️ Nochmal ansehen", small: true, auto: 2.8 },
        lava:       { label: "Lavafluss", hint: "Folge den Leitlichtern bis zur Brücke über den Lavafluss", again: "🌋 Nochmal ansehen", small: true, auto: 3.2, reach: 4 },
        wegweiser:  { label: "Anzeigetafel", hint: "Such ein ✨ nahe bei deiner Rakete", again: "🪧 Nochmal ansehen", small: true, auto: 2.6 },
        rakete:     { label: "Deine Rakete", action: "🚀 Einsteigen", home: true }
      },
      weigh: {
        text: "Stell ein, wie viel du auf der Erde wiegst: {erde} Kilo. Hier auf der Venus zeigt die Waage {mond} Kilo – fast dasselbe!",
        less: "➖ leichter", more: "➕ schwerer", done: "Fertig ✓"
      },
      heat: {
        intro: "465 °C – heißer als in jedem Backofen, sogar im Schatten! Schuld ist die dicke Wolkendecke. Was wäre ohne sie?",
        off: "☁️ Wolken wegschieben", on: "☁️ Wolken zurückholen",
        offText: "Ohne Wolken: Die Wärme kann ins All entweichen. Schau aufs Thermometer – es wird viel kühler!",
        onText: "Mit Wolken: Das Sonnenlicht kommt herein, aber die Wärme kommt nicht mehr hinaus – wie unter einer dicken Decke.",
        done: "Fertig ✓"
      },
      press: {
        ready: "Unter der Glocke steht eine Blechdose, geschützt vor der Venusluft. Was passiert, wenn wir die Glocke öffnen?",
        go: "🔔 Glocke öffnen",
        running: "Die Glocke hebt sich …",
        end: "Zerquetscht! Die Venusluft drückt 90-mal so stark wie die Luft auf der Erde.",
        again: "🔔 Nochmal", done: "Fertig ✓"
      },
      spin: {
        ready: "Links die Venus, rechts die Erde. Wir lassen beide 10 Erdtage lang drehen. Achte auf die roten Fähnchen!",
        go: "🔄 Drehen lassen",
        run: "Erdtage: {erde} · Die Erde dreht sich jeden Tag einmal. Und die Venus?",
        end: "In 10 Tagen hat sich die Venus nur ein winziges Stück gedreht – und andersherum! Für eine ganze Drehung braucht sie 243 Erdtage.",
        again: "🔄 Nochmal", done: "Fertig ✓"
      },
      guess: {
        q: "Was ist größer: die Venus oder die Erde?", a: ["Die Venus", "Die Erde"], c: 1,
        right: "Richtig!", wrong: "Nicht ganz.",
        why: "Die Erde ist ein kleines bisschen größer. Die beiden sind aber fast gleich groß – viel größer als unser Mond.",
        done: "Fertig ✓"
      },
      eveningStar: {
        aim: "Dieses Spezial-Fernrohr schaut durch die Wolken hindurch. Such die Erde – einen hellen blauen Punkt! Zieh mit der Maus oder nimm die Pfeiltasten.",
        aimTouch: "Dieses Spezial-Fernrohr schaut durch die Wolken hindurch. Such die Erde – einen hellen blauen Punkt! Wische, um es zu schwenken.",
        hint: "Tipp der Bodenstation: Die Erde ist in dieser Richtung",
        almost: "Fast! Halte das Fernrohr genau auf den blauen Punkt.",
        found: "Das ist die Erde – und der winzige Punkt daneben ist der Mond! Von der Erde aus gesehen ist die Venus der hellste Punkt am Himmel: der Abendstern.",
        done: "Fertig ✓"
      },
      radio: {
        start: "Hier ist die Bodenstation! Willkommen auf der Venus, {name}! Dein Spezialanzug schützt dich vor Hitze und Druck. Hier gibt es {anzahl} Dinge zu entdecken. Durch die dicken Wolken siehst du nicht weit – folge dem Pfeil oben! Den Roboter-Außenposten siehst du vor dir – die Menschen wohnen oben in den Wolken, im Luftschiff. An seiner Wand erscheint alles, was du entdeckt hast.",
        found: "Klasse Entdeckung! Noch {rest} übrig.",
        back: "Willkommen zurück auf der Venus, {name}! Dir fehlen noch {rest} Entdeckungen – folge dem Pfeil oben. Tipps findest du oben rechts bei der Lupe.",
        allFound: "Fantastisch, {name}! Du hast alles entdeckt. Die Bodenstation hat noch {fragen} Fragen an dich.",
        tooFar: "Bodenstation an {name}: Bitte entferne dich nicht zu weit von der Rakete!",
        quizDone: "Mission erfüllt! Wenn du fertig bist, lauf zurück zu deiner Rakete und steig über die Leiter ein – oder erkunde noch ein bisschen."
      },
      quiz: [
        { q: "Warum ist es auf der Venus so heiß?", a: ["Weil sie der Sonne am nächsten ist", "Weil die dicken Wolken die Wärme festhalten", "Weil sie innen brennt"], c: 1, why: "Die Wolken wirken wie eine dicke Decke – die Wärme kommt nicht mehr hinaus." },
        { q: "Was ist mit der Blechdose passiert?", a: ["Sie ist geschmolzen", "Sie ist davongeflogen", "Die dichte Luft hat sie zerquetscht"], c: 2, why: "Die Venusluft drückt 90-mal so stark wie die Luft auf der Erde." },
        { q: "Wo geht auf der Venus die Sonne auf?", a: ["Im Osten, wie bei uns", "Im Westen", "Gar nicht"], c: 1, why: "Die Venus dreht sich andersherum als die Erde – darum geht die Sonne dort im Westen auf." }
      ]
    },

    erde: {
      gravity: 9.81, jump: 0.11,
      temp: { sun: 22, shade: 15, sunText: "☀️ Sonne – angenehm warm!", shadeText: "🌳 Schatten – schön kühl!" },
      // Jana arbeitet im Besucherzentrum und trainiert selbst für einen Flug ins All – darum trägt sie einen Trainingsanzug
      npcs: [
        { name: "Astronautin Jana", color: "#2563eb", path: [[-6, 74], [8, 74], [2, 70]],
          hello: "Hallo {name}! Willkommen zu Hause! Warte, ich komme zu dir.",
          hint: "Warst du schon bei „{ziel}“? Folge dem Weg um den See!",
          done: "Du hast alles entdeckt! Siehst du jetzt, wie besonders unsere Erde ist?",
          facts: ["Ich trainiere gerade für einen Flug ins All. Das Training dauert mehrere Jahre!",
            "Die Erde ist der einzige Planet, den wir kennen, auf dem es Leben gibt.",
            "Im Besucherzentrum lernen Kinder alles über die Raumfahrt – so wie du heute."] }
      ],
      guide: {
        npc: 0, order: ["sprung", "wegweiser", "waage", "wasser", "wald", "mond", "groesse", "tag", "stern", "luft"],
        hello: "Hallo {name}! Willkommen zu Hause! Warte, ich komme zu dir.",
        welcome: "Ich bin Jana und trainiere hier für meinen ersten Flug ins All. Heute machen wir einen Rundweg um den See. Du wirst staunen, wie besonders unsere Erde ist! Spring zuerst mal – wie hoch kommst du?",
        jump: "Spring mal! Und vergleich das mit dem Mond oder dem Mars.",
        wait: "Hier lang, {name}! Ich warte auf dich.",
        next: "Prima! Weiter auf dem Rundweg – als Nächstes: {ziel}.",
        arrive: {
          wegweiser: "Siehst du den Wegweiser? Lauf mal ganz nah heran!",
          waage: "Hier ist eine Waage. Was zeigt sie dir auf der Erde an?",
          wasser: "Das ist unser See. Geh bis ans Ufer!",
          wald: "Jetzt geht's in den Wald. Hörst du die Vögel? Lauf zwischen die Bäume!",
          mond: "Hier oben auf dem Hügel steht die Volkssternwarte. Das Dach rollt zur Seite – such den Mond!",
          groesse: "Vor dem Besucherzentrum stehen Planetenkugeln. Welche ist am größten?",
          tag: "Willkommen im Park! An der Sonnenuhr spulen wir einen ganzen Tag vor.",
          stern: "In dieser Vitrine liegt ein echter Brocken aus dem All. Was passiert, wenn so einer auf die Erde fällt?",
          luft: "Das ist unsere Wetterstation. Was wäre, wenn die Erde keine Luft hätte? Probier es aus!",
          wand: "Im Besucherzentrum siehst du an der Wand alles, was du entdeckt hast.",
          rakete: "Hier ist deine Rakete. Gute Reise, {name}! Und komm heil wieder nach Hause."
        },
        quiz: "Du hast alles entdeckt! Komm mit zum Besucherzentrum – die Bodenstation hat Fragen an dich.",
        home: "Super gemacht, {name}! Ich bringe dich zurück zu deiner Rakete.",
        alone: "Alles klar, erkunde allein! Wenn du mich brauchst, komm einfach zu mir.",
        again: "🧭 Jana, zeig mir den Weg"
      },
      discoveries: [
        { key: "sprung", icon: "🦘", title: "Hier bist du am schwersten", hint: "Spring mal in die Luft!", fallback: { hoehe: "etwa 11 Zentimeter", zeit: "0,3" },
          text: "Nur {hoehe}! Mit dem schweren Raumanzug kommst du auf der Erde kaum vom Boden weg. Auf dem Mond wärst du mit demselben Absprung sechsmal so hoch gekommen. Die Erde ist der größte Gesteinsplanet und zieht am stärksten an dir." },
        { key: "waage", icon: "⚖️", title: "Genau dein Gewicht", fallback: { erde: "30", mond: "30,0" },
          text: "Hier zeigt die Waage genau {mond} Kilo – dein richtiges Gewicht. Auf dem Mars wären es gut ein Drittel davon, auf dem Mond nur ein Sechstel und auf Pluto noch viel weniger." },
        { key: "luft", icon: "🌬️", title: "Unser Schutzschild",
          text: "Die Luft um die Erde nennt man Atmosphäre. Sie macht den Himmel blau, hält die Erde angenehm warm und schützt uns wie ein Schild. Und das Wichtigste: Wir können sie atmen! Auf keinem anderen Planeten könntest du ohne Raumanzug überleben." },
        { key: "stern", icon: "🌠", title: "Sternschnuppe!",
          text: "Verglüht! Die Luft bremst den Brocken so stark, dass er glühend heiß wird und aufleuchtet – das ist eine Sternschnuppe. Auf dem Merkur oder dem Mond wäre derselbe Brocken eingeschlagen und hätte einen Krater hinterlassen. Die Luft schützt uns also auch vor Steinen aus dem All." },
        { key: "tag", icon: "🌗", title: "Tag und Nacht",
          text: "Ein ganzer Tag ist vorbei: 24 Stunden. Dabei wandert gar nicht die Sonne – die Erde dreht sich einmal um sich selbst! So entstehen Tag und Nacht. Für eine Runde um die Sonne braucht die Erde ein Jahr: 365 Tage." },
        { key: "groesse", icon: "📏", title: "Der größte Gesteinsplanet",
          text: "Merkur, Venus, Erde und Mars haben einen festen Boden aus Gestein. Die Erde ist mit 12.742 Kilometern der größte von ihnen – knapp vor der Venus. Die vier Riesenplaneten dahinter sind aber noch viel größer!" },
        { key: "mond", icon: "🌙", title: "Unser Mond", photo: "erde-1.jpg",
          text: "Die Erde hat genau einen Mond. Er ist 384.400 Kilometer entfernt – und der einzige andere Himmelskörper, auf dem schon Menschen waren. Manchmal sieht man ihn sogar am Tag! Das Foto zeigt es umgekehrt: die Erde, vom Mond aus gesehen." },
        { key: "wasser", icon: "💧", title: "Der Blaue Planet", photo: "erde.jpg",
          text: "Flüssiges Wasser! Ungefähr zwei Drittel der Erde sind mit Wasser bedeckt – darum nennt man sie den Blauen Planeten. Auf keinem anderen Planeten gibt es Seen, Flüsse und Meere aus Wasser. Hier ist es genau richtig: nicht zu heiß und nicht zu kalt." },
        { key: "wald", icon: "🌳", title: "Leben!",
          text: "Bäume, Gras, Tiere, Menschen: Die Erde ist der einzige Planet, von dem wir wissen, dass es dort Leben gibt. Dafür braucht es Wasser, Luft und die richtige Temperatur – all das gibt es nur hier. Darum müssen wir gut auf unsere Erde aufpassen." },
        { key: "wegweiser", icon: "🪧", title: "Genau richtig weit weg",
          text: "Die Erde ist der dritte Planet. Bis zur Sonne sind es 150 Millionen Kilometer – das Sonnenlicht braucht dafür 8 Minuten. Näher dran wäre es zu heiß, weiter weg zu kalt. Im Durchschnitt ist es auf der Erde etwa 15 °C warm." }
      ],
      stations: {
        wand:      { label: "Wusstest du?", action: "📋 Meine Entdeckungen lesen", info: true, reach: 6.5 },
        waage:     { label: "Waage", hint: "Stell dich auf die Waage", action: "⚖️ Auf die Waage stellen" },
        luft:      { label: "Wetterstation", hint: "Probier an der Wetterstation den Luft-Versuch aus", action: "🌬️ Luft-Versuch starten" },
        stern:     { label: "Meteoriten-Vitrine", hint: "An der Meteoriten-Vitrine wartet der Sternschnuppen-Versuch", action: "🌠 Brocken aus dem All fallen lassen" },
        tag:       { label: "Sonnenuhr im Park", hint: "Spul im Park an der Sonnenuhr die Zeit vor", action: "⏩ Einen Tag vorspulen" },
        groesse:   { label: "Größenvergleich", hint: "Geh zum Besucherzentrum und schau dir die Kugeln an", action: "📏 Größe schätzen" },
        mond:      { label: "Volkssternwarte", hint: "In der Volkssternwarte rollt das Dach zur Seite – schau durchs Fernrohr", action: "🔭 Dach öffnen und durchschauen" },
        wasser:    { label: "See", hint: "Lauf ans Ufer des Sees vor deiner Rakete", again: "💧 Nochmal ansehen", small: true, reach: 6 },
        wald:      { label: "Wald", hint: "Lauf in den Wald links vom See", again: "🌳 Nochmal ansehen", small: true, auto: 5, reach: 6 },
        wegweiser: { label: "Wegweiser", hint: "Such ein ✨ nahe bei deiner Rakete", again: "🪧 Nochmal ansehen", small: true, auto: 2.6 },
        rakete:    { label: "Deine Rakete", action: "🚀 Einsteigen", home: true }
      },
      weigh: {
        text: "Stell ein, wie viel du wiegst: {erde} Kilo. Hier auf der Erde zeigt die Waage genau {mond} Kilo!",
        less: "➖ leichter", more: "➕ schwerer", done: "Fertig ✓"
      },
      air: {
        intro: "Die Luft um die Erde nennt man Atmosphäre. Was wäre, wenn sie plötzlich weg wäre?",
        off: "🚫 Luft wegnehmen", on: "🌬️ Luft zurückholen",
        offText: "Ohne Luft: Der Himmel ist schwarz wie auf dem Mond, die Schatten sind tiefschwarz – und atmen könnte hier niemand.",
        onText: "Mit Luft: Der Himmel ist blau. Die Luft schützt uns wie ein Schild und hält die Erde angenehm warm.",
        done: "Fertig ✓"
      },
      shooting: {
        ready: "Auf dem Merkur schlägt ein Brocken aus dem All einfach ein. Und hier, wo es Luft gibt?",
        go: "🌠 Brocken fallen lassen",
        running: "Achtung, er kommt … schau zum Himmel!",
        end: "Verglüht, bevor er unten ankommt! Die Luft hat ihn gebremst und zum Glühen gebracht – eine Sternschnuppe.",
        again: "🌠 Nochmal", done: "Fertig ✓"
      },
      day: {
        ready: "Die Sonnenuhr zeigt mit ihrem Schatten die Uhrzeit. Wir spulen einen ganzen Tag vor – schau auf Sonne, Schatten und Himmel!",
        day: "{uhr} Uhr: Es ist Tag. Die Sonne wandert über den Himmel.",
        night: "{uhr} Uhr: Es ist Nacht. Jetzt sieht man die Sterne!",
        end: "24 Stunden sind vorbei. Aber eigentlich wandert nicht die Sonne – die Erde dreht sich einmal um sich selbst!",
        again: "⏩ Nochmal", done: "Fertig ✓"
      },
      guess: {
        q: "Merkur, Mars, Venus, Erde: Welcher ist der größte?", a: ["Die Venus", "Die Erde"], c: 1,
        right: "Richtig!", wrong: "Nicht ganz.",
        why: "Die Erde ist der größte der vier Gesteinsplaneten – knapp vor der Venus. Mars und Merkur sind viel kleiner.",
        done: "Fertig ✓"
      },
      moonScope: {
        aim: "Manchmal steht der Mond auch am Tag am Himmel. Such ihn! Zieh mit der Maus über den Himmel oder nimm die Pfeiltasten.",
        aimTouch: "Manchmal steht der Mond auch am Tag am Himmel. Such ihn! Wische über den Himmel, um das Fernrohr zu schwenken.",
        hint: "Tipp der Bodenstation: Der Mond ist in dieser Richtung",
        almost: "Fast! Halte das Fernrohr genau auf den Mond.",
        found: "Da ist er: unser Mond! Die dunklen Flecken nennt man Meere – Wasser gibt es dort aber keins. Warst du schon dort?",
        done: "Fertig ✓"
      },
      radio: {
        start: "Hier ist die Bodenstation! Willkommen zu Hause, {name}! Auch auf der Erde gibt es {anzahl} Dinge zu entdecken – und du wirst staunen, wie besonders unser Planet ist. Die schwebenden Symbole zeigen dir die Stationen, ein ✨ ist ein Fundstück – und der Pfeil oben führt dich zur nächsten Entdeckung.",
        found: "Klasse Entdeckung! Noch {rest} übrig.",
        back: "Willkommen zurück auf der Erde, {name}! Dir fehlen noch {rest} Entdeckungen – folge dem Pfeil oben. Tipps findest du oben rechts bei der Lupe.",
        allFound: "Fantastisch, {name}! Du hast alles entdeckt. Die Bodenstation hat noch {fragen} Fragen an dich.",
        tooFar: "Bodenstation an {name}: Bitte entferne dich nicht zu weit von der Rakete!",
        quizDone: "Mission erfüllt! Wenn du fertig bist, lauf zurück zu deiner Rakete und steig über die Leiter ein – oder erkunde noch ein bisschen."
      },
      quiz: [
        { q: "Warum verglüht eine Sternschnuppe?", a: ["Weil die Luft sie bremst und erhitzt", "Weil sie aus Feuer besteht", "Weil die Sonne sie anzündet"], c: 0, why: "Die Luft bremst den Brocken so stark, dass er glühend heiß wird." },
        { q: "Was gibt es nur auf der Erde?", a: ["Krater", "Flüssiges Wasser und Leben", "Berge"], c: 1, why: "Seen, Meere und Lebewesen kennen wir nur von der Erde." },
        { q: "Wie wäre der Himmel ohne Luft?", a: ["Blau wie immer", "Schwarz, sogar am Tag", "Grün"], c: 1, why: "Erst die Luft verteilt das Sonnenlicht und macht den Himmel blau." }
      ]
    },

    /* ---------- Sonden (probe: true): Hier kann man nicht landen. Das Kind steuert eine Sonde durch Mess-Tore;
       jedes Tor ist eine Entdeckung (in dieser Reihenfolge). course = Texte für den Flug. ---------- */
    jupiter: {
      probe: true,
      flight: { who: "🎧 Flugleiterin Nora", gates: ["Nora hier, deine Flugleiterin! Erstes Tor voraus: Es misst, wie groß der Jupiter wirklich ist.","Schau nach unten – gleich kommt ein Tor über einem riesigen roten Wirbel!","Das nächste Tor liegt zwischen den Wolkenstreifen. Halt drauf zu!","Achtung, nächstes Tor: Es misst, wie schnell sich der Jupiter dreht.","Wir sinken tiefer. Das Tor da vorn sucht nach festem Boden …","Nächstes Tor: Es zählt die Monde, die um den Jupiter kreisen.","Siehst du die Blitze? Dort vorn ist ein Tor mitten im Gewitter!","Letztes Tor! Es wird ganz dunkel und der Druck steigt – halte durch!"] },
      course: { note: "🪂 Kapsel wie „Galileo“ – Abstieg in die Wolken", miss: "Tor verpasst – es kommt gleich noch einmal!" },
      discoveries: [
        { key: "groesse", icon: "🟠", title: "Der größte Planet", photo: "jupiter.jpg",
          text: "Jupiter ist der größte Planet im Sonnensystem: Er ist 11-mal so breit wie die Erde, und in ihn würden mehr als 1.300 Erden passen! Von der Sonne ist er 778 Millionen Kilometer entfernt." },
        { key: "fleck", icon: "🌀", title: "Der Große Rote Fleck", photo: "jupiter-1.jpg",
          text: "Der Große Rote Fleck ist ein riesiger Wirbelsturm – größer als die ganze Erde! Er tobt schon seit fast 200 Jahren, ohne aufzuhören. Das Foto hat die Raumsonde Juno aus der Nähe gemacht." },
        { key: "streifen", icon: "🎨", title: "Streifen aus Wolken",
          text: "Die hellen und dunklen Streifen sind Bänder aus Wolken. Sie ziehen in entgegengesetzte Richtungen um den Planeten – mit Winden von mehr als 500 km/h. Merkst du, wie der Wind an deiner Sonde zerrt?" },
        { key: "tag", icon: "⏱️", title: "Der schnellste Dreher",
          text: "Jupiter dreht sich von allen Planeten am schnellsten: Ein Tag dauert dort nur etwa 10 Stunden. Für eine Runde um die Sonne braucht er dagegen fast 12 Erdjahre." },
        { key: "gas", icon: "☁️", title: "Kein Boden in Sicht",
          text: "Deine Sonde sinkt tiefer und tiefer – und findet keinen Boden! Jupiter ist ein Gasriese. Er besteht vor allem aus den Gasen Wasserstoff und Helium. Nach unten wird das Gas nur immer dichter und heißer." },
        { key: "monde", icon: "🌕", title: "Über 90 Monde",
          text: "Jupiter hat über 90 Monde! Die vier größten hat Galileo Galilei schon im Jahr 1610 mit einem der ersten Fernrohre entdeckt. Der größte heißt Ganymed – er ist sogar größer als der Planet Merkur." },
        { key: "blitze", icon: "⚡", title: "Riesige Gewitter",
          text: "Hast du das Wetterleuchten gesehen? In Jupiters Wolken toben Gewitter mit Blitzen, die viel stärker sind als die Blitze auf der Erde." },
        { key: "druck", icon: "🛰️", title: "Funkstille",
          text: "Tief in den Wolken drückt das Gas immer stärker. 1995 tauchte wirklich eine Sonde in den Jupiter ein: Sie gehörte zur Raumsonde Galileo und funkte 58 Minuten lang Messwerte. Dann wurde sie vom Druck zerquetscht. Deine Sonde steigt jetzt lieber wieder auf!" }
      ],
      radio: {
        start: "Hier ist die Bodenstation! {name}, auf dem Jupiter kann man nicht landen: Er hat keinen festen Boden. Darum steuerst du jetzt eine Eintauch-Kapsel mit Fallschirm – so eine hat die Sonde Galileo 1995 wirklich in die Jupiterwolken geschickt. Flieg durch die leuchtenden Mess-Tore – hinter jedem steckt eine Entdeckung. Es gibt {anzahl}!",
        found: "Klasse Entdeckung! Noch {rest} übrig.",
        back: "Deine Sonde ist wieder beim Jupiter, {name}! Dir fehlen noch {rest} Entdeckungen – flieg durch die blauen Mess-Tore.",
        allFound: "Fantastisch, {name}! Du hast alles entdeckt. Die Bodenstation hat noch {fragen} Fragen an dich.",
        quizDone: "Mission erfüllt! Tippe oben auf „Zurück zur Rakete“ – oder flieg noch ein bisschen weiter."
      },
      quiz: [
        { q: "Was findet deine Sonde, als sie in den Jupiter eintaucht?", a: ["Einen festen Boden aus Stein", "Immer dichteres Gas, aber keinen Boden", "Ein Meer aus Wasser"], c: 1, why: "Jupiter ist ein Gasriese – es wird nur immer dichter und heißer." },
        { q: "Was sind die Streifen auf dem Jupiter?", a: ["Bänder aus Wolken", "Flüsse", "Straßen"], c: 0, why: "Die Wolkenbänder ziehen mit starken Winden um den Planeten." },
        { q: "Wie lange dauert ein Tag auf dem Jupiter?", a: ["Etwa 10 Stunden", "24 Stunden", "100 Stunden"], c: 0, why: "Jupiter dreht sich von allen Planeten am schnellsten." }
      ]
    },

    saturn: {
      probe: true,
      flight: { who: "🎧 Flugleiterin Nora", gates: ["Nora hier, deine Flugleiterin! Erstes Tor voraus: Es misst, woraus die Ringe bestehen.","Nächstes Tor: Wie dick sind die Ringe eigentlich?","Da vorn ist ein Tor in einer großen Lücke zwischen den Ringen!","Nächstes Tor: Es prüft, wie schwer der Saturn ist – rate mal!","Das Tor da vorn schaut tief in den Planeten hinein.","Nächstes Tor: Es misst den größten Saturnmond.","Achtung, Tor voraus über dem Nordpol – dort dreht sich ein seltsamer Sturm!","Letztes Tor! Es erzählt dir von einer echten Sonde."] },
      course: { note: "🛰️ Sonde „Cassini“ – Flug durch die Ringe", miss: "Tor verpasst – es kommt gleich noch einmal!", bump: "Rumms! Ein Eisbrocken – weich lieber aus!" },
      discoveries: [
        { key: "ringe", icon: "🧊", title: "Ringe aus Eis", photo: "saturn-1.jpg",
          text: "Aus der Nähe siehst du es: Die Ringe sind gar nicht fest! Sie bestehen aus unzähligen Brocken aus Eis und Gestein. Manche sind so klein wie Sandkörner, manche so groß wie ein Haus." },
        { key: "duenn", icon: "📏", title: "Hauchdünn",
          text: "Die Ringe sind fast 300.000 Kilometer breit – aber an vielen Stellen nur etwa so dick, wie ein Haus hoch ist! Wären sie ein Blatt Papier, dann wäre das Blatt so groß wie eine ganze Stadt." },
        { key: "luecke", icon: "🕳️", title: "Die große Lücke",
          text: "Zwischen den Ringen gibt es dunkle Lücken. Die größte ist fast 5.000 Kilometer breit – so breit wie ein Ozean. Dort ziehen Monde mit ihrer Anziehungskraft die Brocken weg." },
        { key: "leicht", icon: "🛁", title: "Leichter als Wasser",
          text: "Saturn ist riesig, aber sehr leicht gebaut: Er ist leichter als die gleiche Menge Wasser. In einer Badewanne, die groß genug wäre, würde er schwimmen!" },
        { key: "gas", icon: "☁️", title: "Noch ein Gasriese",
          text: "Saturn ist der zweitgrößte Planet – 9-mal so breit wie die Erde. Wie Jupiter ist er ein Gasriese ohne festen Boden. Ein Tag dauert dort nur etwa 10½ Stunden, ein Jahr aber 29 Erdjahre." },
        { key: "titan", icon: "🌫️", title: "Titan", photo: "saturn-2.jpg",
          text: "Saturn hat mehr Monde als jeder andere Planet: über 200! Der größte heißt Titan. Er hat eine dicke Lufthülle und Seen – aber nicht aus Wasser, sondern aus flüssigem Gas. 2005 ist dort sogar eine Sonde gelandet: Das Foto zeigt den Boden von Titan." },
        { key: "sechseck", icon: "⬡", title: "Der sechseckige Sturm",
          text: "Am Nordpol des Saturn gibt es einen Sturm in der Form eines Sechsecks! Jede seiner sechs Seiten ist länger, als die Erde breit ist. Niemand weiß ganz genau, warum er diese Form hat." },
        { key: "cassini", icon: "🛰️", title: "Die Sonde Cassini", photo: "saturn.jpg",
          text: "Die Raumsonde Cassini hat den Saturn 13 Jahre lang umkreist, von 2004 bis 2017, und dieses Foto gemacht. Am Ende ließ man sie absichtlich in den Saturn stürzen – damit sie nicht aus Versehen auf einen seiner Monde fällt." }
      ],
      radio: {
        start: "Hier ist die Bodenstation! {name}, auch der Saturn hat keinen festen Boden. Deine Sonde ist der echten Sonde Cassini nachgebaut und fliegt jetzt mitten durch die berühmten Ringe! Da hinten siehst du den Mond Enceladus mit seinen Eis-Fontänen. Flieg durch die leuchtenden Mess-Tore – und weich den Eisbrocken aus. Es gibt {anzahl} Entdeckungen!",
        found: "Klasse Entdeckung! Noch {rest} übrig.",
        back: "Deine Sonde ist wieder beim Saturn, {name}! Dir fehlen noch {rest} Entdeckungen – flieg durch die blauen Mess-Tore.",
        allFound: "Fantastisch, {name}! Du hast alles entdeckt. Die Bodenstation hat noch {fragen} Fragen an dich.",
        quizDone: "Mission erfüllt! Tippe oben auf „Zurück zur Rakete“ – oder flieg noch ein bisschen weiter."
      },
      quiz: [
        { q: "Wie dick sind die Ringe des Saturn an vielen Stellen?", a: ["So dick wie die Erde", "Nur etwa so dick, wie ein Haus hoch ist", "Tausend Kilometer"], c: 1, why: "Die Ringe sind riesig breit, aber hauchdünn." },
        { q: "Welche Form hat der Sturm am Nordpol des Saturn?", a: ["Ein Sechseck", "Ein Herz", "Einen Stern"], c: 0, why: "Jede Seite des Sechsecks ist länger, als die Erde breit ist." },
        { q: "Wie endete die Reise der Sonde Cassini?", a: ["Sie landete wieder auf der Erde", "Man ließ sie in den Saturn stürzen", "Sie fliegt heute noch"], c: 1, why: "So konnte sie nicht aus Versehen auf einen Mond fallen." }
      ]
    },

    uranus: {
      probe: true,
      flight: { who: "🎧 Flugleiterin Nora", gates: ["Nora hier, deine Flugleiterin! Erstes Tor voraus: Schau dir an, wie der Uranus liegt.","Nächstes Tor: Achte auf die Ringe – fällt dir etwas auf?","Das Tor da vorn misst, woraus der Uranus besteht.","Nächstes Tor: Warum ist er so blau?","Brr – das nächste Tor misst die Temperatur!","Nächstes Tor: Es geht um die Jahreszeiten auf dem Uranus.","Das Tor da vorn erzählt, wie der Uranus entdeckt wurde.","Letztes Tor! Wie oft war schon eine Sonde hier?"] },
      course: { note: "🛰️ Uranus-Sonde – eiskalt hier draußen!", miss: "Tor verpasst – es kommt gleich noch einmal!" },
      discoveries: [
        { key: "gekippt", icon: "🙃", title: "Auf der Seite",
          text: "Uranus ist ein Querkopf: Er liegt auf der Seite und rollt wie eine Kugel um die Sonne! Forscher glauben, dass ihn vor langer Zeit ein riesiger Himmelskörper gerammt und umgekippt hat." },
        { key: "ringe", icon: "⭕", title: "Senkrechte Ringe",
          text: "Auch Uranus hat Ringe: 13 dünne, dunkle Ringe. Weil der Planet auf der Seite liegt, stehen sie fast senkrecht – wie ein Reifen, der um ihn herum aufgestellt ist." },
        { key: "eisriese", icon: "🧊", title: "Ein Eisriese",
          text: "Uranus ist 4-mal so breit wie die Erde. Anders als Jupiter und Saturn besteht er vor allem aus eisigen Stoffen wie Wasser, Ammoniak und Methan. Darum nennt man ihn Eisriese. Einen festen Boden hat er trotzdem nicht." },
        { key: "farbe", icon: "🎨", title: "Eisblau",
          text: "Warum ist Uranus so schön blaugrün? In seiner Lufthülle gibt es ein Gas namens Methan. Es verschluckt das rote Licht der Sonne – übrig bleibt Blaugrün." },
        { key: "kalt", icon: "🥶", title: "Der kälteste Planet",
          text: "Auf Uranus kann es bis zu −224 °C kalt werden. Damit ist er der kälteste Planet – sogar kälter als Neptun, obwohl der noch weiter von der Sonne weg ist!" },
        { key: "sommer", icon: "🌞", title: "42 Jahre Sommer",
          text: "Ein Jahr dauert auf Uranus 84 Erdjahre. Weil er auf der Seite liegt, scheint die Sonne 42 Jahre lang auf den einen Pol – und der andere hat 42 Jahre lang Winter und Dunkelheit." },
        { key: "herschel", icon: "🔭", title: "Mit dem Fernrohr entdeckt",
          text: "Uranus wurde als erster Planet mit einem Fernrohr entdeckt – im Jahr 1781. Der Entdecker hieß Wilhelm Herschel. Er kam aus Hannover und war eigentlich Musiker!" },
        { key: "voyager", icon: "🛰️", title: "Nur ein einziger Besuch", gallery: ["uranus.jpg", "uranus-1.jpg"],
          text: "Nur eine einzige Raumsonde war je beim Uranus: Voyager 2 flog 1986 an ihm vorbei und machte diese Fotos. Uranus hat über 25 Monde. Sie sind nach Figuren aus Theaterstücken benannt, zum Beispiel Titania, Oberon und Miranda." }
      ],
      radio: {
        start: "Hier ist die Bodenstation! {name}, der Uranus ist ein Riese aus eisigen Gasen – landen geht nicht. Deine Sonde ist eine, wie die NASA sie zum Uranus schicken will. Steuere sie durch die leuchtenden Mess-Tore! Schau dir den Planeten genau an: Fällt dir an seinen Ringen etwas auf? Es gibt {anzahl} Entdeckungen!",
        found: "Klasse Entdeckung! Noch {rest} übrig.",
        back: "Deine Sonde ist wieder beim Uranus, {name}! Dir fehlen noch {rest} Entdeckungen – flieg durch die blauen Mess-Tore.",
        allFound: "Fantastisch, {name}! Du hast alles entdeckt. Die Bodenstation hat noch {fragen} Fragen an dich.",
        quizDone: "Mission erfüllt! Tippe oben auf „Zurück zur Rakete“ – oder flieg noch ein bisschen weiter."
      },
      quiz: [
        { q: "Warum nennt man Uranus einen Eisriesen?", a: ["Weil er vor allem aus eisigen Stoffen besteht", "Weil er aus Glas ist", "Weil dort Schnee liegt"], c: 0, why: "Uranus besteht vor allem aus Wasser, Ammoniak und Methan." },
        { q: "Wie lange dauert ein Sommer am Pol des Uranus?", a: ["3 Monate", "42 Jahre", "Einen Tag"], c: 1, why: "Ein Uranus-Jahr dauert 84 Erdjahre – und er liegt auf der Seite." },
        { q: "Wie stehen die Ringe des Uranus?", a: ["Fast senkrecht", "Flach wie beim Saturn", "Er hat keine Ringe"], c: 0, why: "Weil Uranus auf der Seite liegt, stehen auch seine Ringe fast senkrecht." }
      ]
    },

    neptun: {
      probe: true,
      flight: { who: "🎧 Flugleiterin Nora", gates: ["Nora hier, deine Flugleiterin! Spürst du den Wind? Erstes Tor voraus – lenk dagegen!","Nächstes Tor: Es fliegt über einen dunklen Wirbel.","Das Tor da vorn misst, warum der Neptun so blau ist.","Nächstes Tor: Wie weit sind wir von der Sonne weg?","Das Tor da vorn misst, wie lange der Neptun für eine Runde braucht.","Nächstes Tor: Es erzählt, wie der Neptun gefunden wurde – zuerst nur durch Rechnen!","Siehst du den hellen Mond? Das nächste Tor misst ihn!","Letztes Tor! Es erzählt von deiner Sonde, Voyager 2."] },
      course: { note: "🛰️ „Voyager 2“ – der Wind schiebt dich, lenk dagegen!", miss: "Tor verpasst – es kommt gleich noch einmal!" },
      discoveries: [
        { key: "wind", icon: "💨", title: "Die stärksten Winde",
          text: "Merkst du, wie deine Sonde zur Seite gedrückt wird? Auf Neptun wehen die stärksten Winde im ganzen Sonnensystem: über 2.000 km/h – schneller als ein Düsenflugzeug!" },
        { key: "fleck", icon: "🌀", title: "Der dunkle Fleck",
          text: "1989 entdeckte die Sonde Voyager 2 auf Neptun einen dunklen Wirbelsturm, so groß wie die Erde. Als man ein paar Jahre später wieder hinschaute, war er verschwunden! Auf Neptun entstehen und vergehen ständig neue Stürme." },
        { key: "blau", icon: "💙", title: "Tiefblau",
          text: "Neptun leuchtet blau. Wie bei Uranus liegt das am Gas Methan in seiner Lufthülle: Es verschluckt das rote Licht. Auch Neptun ist ein Eisriese ohne festen Boden – etwa 4-mal so breit wie die Erde." },
        { key: "weit", icon: "📏", title: "Der äußerste Planet",
          text: "Neptun ist der achte und letzte Planet: 4,5 Milliarden Kilometer von der Sonne entfernt – 30-mal so weit wie die Erde. Das Sonnenlicht braucht etwa 4 Stunden bis hierher. Darum ist es −200 °C kalt." },
        { key: "jahr", icon: "🗓️", title: "165 Jahre für eine Runde",
          text: "Für eine Runde um die Sonne braucht Neptun 165 Erdjahre. Seit er 1846 entdeckt wurde, hat er erst ein einziges Mal die Sonne umrundet – im Jahr 2011 war die Runde voll." },
        { key: "rechnen", icon: "🧮", title: "Mit Mathematik gefunden",
          text: "Neptun wurde zuerst berechnet und dann erst gesehen! Forschern fiel auf, dass Uranus ein bisschen anders lief als erwartet. Sie rechneten aus, wo ein unbekannter Planet an ihm ziehen musste – und 1846 fand man Neptun in einer Sternwarte in Berlin genau dort." },
        { key: "triton", icon: "❄️", title: "Der Mond Triton", photo: "neptun-1.jpg",
          text: "Neptun hat über 15 Monde. Der größte heißt Triton. Er ist eiskalt, hat Geysire aus Eis und umkreist Neptun verkehrt herum – andersherum, als Neptun sich dreht." },
        { key: "voyager", icon: "🛰️", title: "12 Jahre unterwegs", photo: "neptun.jpg",
          text: "Nur eine einzige Raumsonde hat Neptun je besucht: Voyager 2. Sie startete 1977 und kam erst 1989 an – nach 12 Jahren Flug! Dabei ist dieses Foto entstanden." }
      ],
      radio: {
        start: "Hier ist die Bodenstation! {name}, du bist am äußersten Planeten angekommen. Auch Neptun hat keinen festen Boden. Du steuerst Voyager 2 – die einzige Sonde, die je beim Neptun war (1989). Flieg durch die leuchtenden Mess-Tore – aber Achtung: Der Sturm drückt dich zur Seite! Es gibt {anzahl} Entdeckungen.",
        found: "Klasse Entdeckung! Noch {rest} übrig.",
        back: "Deine Sonde ist wieder beim Neptun, {name}! Dir fehlen noch {rest} Entdeckungen – flieg durch die blauen Mess-Tore.",
        allFound: "Fantastisch, {name}! Du hast alles entdeckt. Die Bodenstation hat noch {fragen} Fragen an dich.",
        quizDone: "Mission erfüllt! Tippe oben auf „Zurück zur Rakete“ – oder flieg noch ein bisschen weiter."
      },
      quiz: [
        { q: "Wie wurde Neptun entdeckt?", a: ["Zuerst berechnet, dann am Himmel gefunden", "Durch Zufall beim Spazierengehen", "Von einer Raumsonde"], c: 0, why: "Man rechnete aus, wo ein unbekannter Planet an Uranus ziehen musste." },
        { q: "Wie lange braucht das Sonnenlicht bis zum Neptun?", a: ["8 Minuten", "Etwa 4 Stunden", "Ein Jahr"], c: 1, why: "Neptun ist 30-mal so weit von der Sonne entfernt wie die Erde." },
        { q: "Warum wurde deine Sonde zur Seite gedrückt?", a: ["Wegen der stärksten Winde im Sonnensystem", "Weil sie kaputt war", "Wegen eines Magneten"], c: 0, why: "Auf Neptun wehen Winde mit über 2.000 km/h." }
      ]
    },

    sonne: {
      probe: true,
      flight: { who: "🎧 Flugleiterin Nora", gates: ["Nora hier, deine Flugleiterin! Hitzeschild bereit? Erstes Tor voraus!","Nächstes Tor: Es misst, wie riesig die Sonne ist.","Das Tor da vorn stoppt die Zeit, die das Licht bis zur Erde braucht.","Achtung, heiß! Das nächste Tor misst die Temperatur.","Nächstes Tor: Es schaut auf dunkle Flecken.","Da vorn – ein Glutbogen! Hinter dem Tor wartet ein Ausbruch.","Nächstes Tor: Es schaut ganz nah auf die brodelnde Oberfläche.","Letztes Tor! Es erzählt von deiner Sonde."] },
      course: { note: "🛡️ „Parker Solar Probe“ – Anflug auf die Sonne", miss: "Tor verpasst – es kommt gleich noch einmal!", bump: "Heiß! Ein Glutball – dein Hitzeschild hält, aber weich lieber aus!" },
      discoveries: [
        { key: "stern", icon: "⭐", title: "Ein Stern",
          text: "Die Sonne ist ein Stern – eine riesige, glühende Kugel aus heißem Gas. Sie ist der einzige Stern in unserem Sonnensystem. Alle anderen Sterne am Himmel sind auch Sonnen, nur unvorstellbar weit weg." },
        { key: "gross", icon: "🌞", title: "Unvorstellbar groß",
          text: "In die Sonne würden ungefähr 1,3 Millionen Erden hineinpassen! Nebeneinander gelegt bräuchte man 109 Erden, um einmal quer über die Sonne zu kommen." },
        { key: "licht", icon: "💡", title: "8 Minuten",
          text: "Das Licht der Sonne braucht ungefähr 8 Minuten bis zur Erde. Wenn du die Sonne siehst, siehst du also, wie sie vor 8 Minuten war! Ohne ihr Licht und ihre Wärme gäbe es kein Leben auf der Erde." },
        { key: "heiss", icon: "🌡️", title: "5.500 Grad",
          text: "An ihrer Oberfläche ist die Sonne etwa 5.500 °C heiß. In ihrem Inneren sind es sogar 15 Millionen Grad! Dort entsteht die Energie, die sie zum Leuchten bringt." },
        { key: "flecken", icon: "⚫", title: "Sonnenflecken", photo: "sonne.jpg",
          text: "Die dunklen Punkte heißen Sonnenflecken. Dort ist die Sonne etwas kühler als ringsum – darum sehen sie dunkel aus. Heiß sind sie trotzdem. Viele sind größer als die ganze Erde!" },
        { key: "ausbruch", icon: "🔥", title: "Sonnenausbruch", photo: "sonne-2.jpg",
          text: "Manchmal schleudert die Sonne glühend heißes Gas weit hinaus ins All. Trifft so eine Wolke auf die Erde, entstehen am Himmel bunte Polarlichter." },
        { key: "waben", icon: "🍯", title: "Brodelnde Oberfläche", photo: "sonne-1.jpg",
          text: "Aus der Nähe sieht die Sonne aus wie kochender Brei: Überall steigen Blasen aus heißem Gas auf und sinken wieder ab. Jede einzelne „Wabe“ auf dem Foto ist größer als Deutschland." },
        { key: "parker", icon: "🛰️", title: "Die Sonnen-Sonde",
          text: "Eine echte Sonde fliegt wirklich so nah an die Sonne: die Parker Solar Probe. Sie ist das schnellste Raumfahrzeug, das Menschen je gebaut haben, und hat einen dicken Hitzeschild – genau wie deine. Und du? Schau niemals direkt in die Sonne, das schadet deinen Augen!" }
      ],
      radio: {
        start: "Hier ist die Bodenstation! {name}, auf der Sonne kann niemand landen – sie ist eine Kugel aus glühendem Gas. Deine Sonde ist die Parker Solar Probe: Sie fliegt wirklich so nah an die Sonne wie nichts zuvor, geschützt von einem Hitzeschild. Flieg durch die leuchtenden Mess-Tore und weich den Glutbällen aus! Es gibt {anzahl} Entdeckungen.",
        found: "Klasse Entdeckung! Noch {rest} übrig.",
        back: "Deine Sonde ist wieder bei der Sonne, {name}! Dir fehlen noch {rest} Entdeckungen – flieg durch die blauen Mess-Tore.",
        allFound: "Fantastisch, {name}! Du hast alles entdeckt. Die Bodenstation hat noch {fragen} Fragen an dich.",
        quizDone: "Mission erfüllt! Tippe oben auf „Zurück zur Rakete“ – oder flieg noch ein bisschen weiter."
      },
      quiz: [
        { q: "Was sind Sonnenflecken?", a: ["Etwas kühlere Stellen auf der Sonne", "Löcher in der Sonne", "Schatten von Planeten"], c: 0, why: "Weil sie kühler sind als ihre Umgebung, sehen sie dunkel aus." },
        { q: "Was schützt deine Sonde vor der Hitze?", a: ["Ein Hitzeschild", "Eine Klimaanlage", "Nichts"], c: 0, why: "Auch die echte Parker Solar Probe hat einen dicken Hitzeschild." },
        { q: "Wie heiß ist die Sonne an ihrer Oberfläche?", a: ["100 °C", "Etwa 5.500 °C", "−200 °C"], c: 1, why: "Im Inneren sind es sogar 15 Millionen Grad." }
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
