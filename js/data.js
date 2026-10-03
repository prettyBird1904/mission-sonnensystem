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
    }
  ],

  /* Missionen: Rätsel, die zu einem Ziel führen.
     brief = so erteilt Flugleiterin Nora die Mission per Funk ({steer} = Steuerung, passend zu Tastatur oder Tablet)
     hint  = ihr Tipp, wenn ein Kind nach einer Weile noch nicht weiterkommt (danach schaltet sie den gelben Pfeil ein) */
  missions: [
    { target: "sonne",   done: "Dein Hitzeschild hat gehalten – die erste Mission ist geschafft!",
      text: "Fliege zu dem Stern, der uns Licht und Wärme schenkt!",
      brief: "Fliege zu dem Stern, der uns Licht und Wärme schenkt! {steer}",
      hint: "Er ist riesig, gelb und leuchtet heller als alles andere – genau in der Mitte des Sonnensystems!" },
    { target: "erde",    done: "Zu Hause war's schön, oder? Mission geschafft!",
      text: "Finde unseren Heimatplaneten – den blauen Planeten!",
      brief: "Finde unseren Heimatplaneten – den blauen Planeten! Dort bist du zu Hause.",
      hint: "Er ist der dritte Planet von der Sonne aus: blau und grün, mit einem kleinen grauen Begleiter." },
    { target: "mond",    done: "Was für ein Mondspaziergang! Mission geschafft.",
      text: "Besuche den treuen Begleiter der Erde.",
      brief: "Besuche den treuen Begleiter der Erde. Dort waren schon echte Astronauten!",
      hint: "Er ist grau, voller Krater und kreist ganz nah um die Erde. Flieg zur Erde und schau dich dort um!" },
    { target: "mars",    done: "Mara und Bennett winken dir noch nach – Mission geschafft!",
      text: "Finde den Roten Planeten.",
      brief: "Finde den Roten Planeten. Unsere Forscherin Mara wartet dort schon auf dich!",
      hint: "Er ist rot wie Rost und kommt direkt nach der Erde – ein Stück weiter weg von der Sonne." },
    { target: "venus",   done: "Puh, raus aus der Hitze! Das hast du super gemacht.",
      text: "Finde den heißesten Planeten im Sonnensystem.",
      brief: "Finde den heißesten Planeten im Sonnensystem. Pass auf – dort ist es heißer als in einem Backofen!",
      hint: "Sie hat dicke, gelbliche Wolken und liegt zwischen Merkur und Erde." },
    { target: "merkur",  done: "Eis geliefert, Sonne bestaunt – auch der Merkur ist geschafft!",
      text: "Welcher Planet ist der Sonne am allernächsten? Fliege hin!",
      brief: "Welcher Planet ist der Sonne am allernächsten? Fliege hin!",
      hint: "Er ist klein, grau und voller Krater – und kreist ganz dicht um die Sonne." },
    { target: "jupiter", done: "Der Riese ist erforscht! Stark gemacht.",
      text: "Fliege zum größten Planeten – dem Riesen mit dem roten Fleck.",
      brief: "Fliege zum größten Planeten – dem Riesen mit dem roten Fleck. Auf ihm kann man nicht landen, aber deine Sonde schafft das!",
      hint: "Nach dem Mars kommt ein Gürtel aus Felsbrocken – und dahinter der gestreifte Riese." },
    { target: "saturn",  done: "Heil durch die Ringe – klasse gesteuert!",
      text: "Finde den Planeten mit den schönsten Ringen.",
      brief: "Finde den Planeten mit den schönsten Ringen. Deine Sonde fliegt mitten hindurch!",
      hint: "Achte auf die großen Ringe! Er kommt direkt nach Jupiter." },
    { target: "uranus",  done: "Brr, der Eisriese ist geschafft! Gleich hast du alle Planeten.",
      text: "Finde den eisblauen Planeten, der auf der Seite liegt.",
      brief: "Finde den eisblauen Planeten, der auf der Seite liegt. Jetzt wird es richtig kalt!",
      hint: "Er ist türkis und kommt nach Saturn. Flieg weiter nach außen!" },
    { target: "neptun",  done: "Ganz außen angekommen – du hast alle Planeten besucht!",
      text: "Fliege zum stürmischen blauen Planeten ganz außen.",
      brief: "Fliege zum stürmischen blauen Planeten ganz außen. Halt dich fest – dort weht der stärkste Wind!",
      hint: "Er ist tiefblau und der letzte Planet. Flieg ganz weit nach außen, noch hinter Uranus!" },
    { target: "#order",  text: "Bringe alle Planeten in die richtige Reihenfolge!",
      brief: "Das ist die letzte Mission: Bringe alle Planeten in die richtige Reihenfolge! Tippe oben rechts auf 🧩 „Ordnen“.",
      hint: "Denk an den Merksatz: Mein Vater erklärt mir jeden Sonntag unseren Nachthimmel!" }
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
    otherProbe: "Das ist {ziel}. Landen kann man hier nicht – aber du kannst eine Sonde hinschicken!",
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
  version: "44",

  // Ergebnis der Funk-Fragen ({r} von {n} richtig)
  quizEnd: { all: "Alle {n} Fragen richtig – ich bin beeindruckt! Bodenstation Ende – guten Flug!", some: "{r} von {n} richtig – gut gemacht! Bodenstation Ende – guten Flug!", none: "Diesmal hat's nicht geklappt – macht nichts, entdeckt hast du trotzdem alles! Bodenstation Ende – guten Flug!" },
  // Funkgespräch am Ende eines Ortes: erst eine Einleitung der Bodenstation (radio.quizIntro je Ort), das Kind antwortet mit dem Knopf
  quizReady: "📻 Ja, ich bin bereit!",
  // Ort schon fertig entdeckt, Funk-Fragen aber noch offen: kein Aufploppen – nur ein Hinweis, wo man sie findet
  radioQuizOpen: "Hier hast du schon alles entdeckt, {name}! Die drei Funk-Fragen findest du oben rechts bei deinen Entdeckungen.",
  quizAgain: "Hallo {name}, hier ist die Bodenstation! Noch eine Runde Funk-Fragen? Gern! Bist du bereit?",
  quizOrder: ["Erste Frage:", "Zweite Frage:", "Und die letzte Frage:"], // wird vor jeder Frage gesprochen
  quizRight: ["Genau!", "Stimmt!", "Richtig!"], quizWrong: ["Knapp daneben.", "Hm, leider nicht.", "Nicht ganz."], // je Frage eine andere Rückmeldung
  // Zwischenstand der Bodenstation (ohne Führung), Index = noch offene Entdeckungen
  radioFound: ["", "Nur noch eins – fast geschafft!", "Das erste hast du! Noch zwei."],
  // Rückmeldung nach einer Vermutung (Versuche) – jeder Ort hat seine eigene (Reihenfolge wie in surfaces)
  guessOk: ["Richtig vermutet!", "Gut getippt!", "Genau so ist es!", "Du hast es geahnt!", "Stimmt genau!"],
  guessNo: ["Gut überlegt – aber schau mal:", "Überraschung!", "Gar nicht so einfach – schau mal:", "Hättest du's gedacht?", "Knapp daneben – schau mal:"],
  mnemonic: "Mein Vater erklärt mir jeden Sonntag unseren Nachthimmel.",

  /* Aussteigen & erkunden: pro Ort 3 Entdeckungen (eine davon ein großes Spiel), 3 Funk-Fragen, kurze Texte –
     das ganze Spiel soll in 45 bis 60 Minuten zu schaffen sein.
     {name} = Name des Kindes, {rest} = noch offene Entdeckungen */
  surfaces: {
    mond: {
      gravity: 1.62, // m/s² – echte Mond-Schwerkraft (Erde: 9,81); gilt für den Hammer-und-Feder-Versuch
      moveGravity: 2.4, // fürs Laufen und Springen etwas stärker, damit es sich nicht zu zäh anfühlt
      jump: 0.6,        // Sprunghöhe in Metern (mit schwerem Raumanzug; so reicht es mit gutem Anlauf über die goldene 4-m-Linie)
      // Thermometer am Raumanzug: in der Sonne / im Schatten
      temp: { sun: 120, shade: -150, sunText: "☀️ Sonne – glühend heiß!", shadeText: "❄️ Schatten – eiskalt!" },
      // Nora steigt mit aus der Rakete und führt das Kind (Sprechblase über ihrem Kopf); die Bewohner bleiben vor Ort
      // Figuren, die sich miteinander unterhalten (das Kind hört zu) – freiwillig, zählen nicht zur Mission
      crew: [
        {name: "Geologin Yuki", short: "Yuki", f: true, color: "#a855f7", spot: [-15,29]},
        {name: "Arzt Felix", short: "Felix", color: "#0ea5e9", spot: [-12.6,30.6]}
      ],
      talks: [
        [
          ["Yuki", "Felix, schau mal! Dieser Stein ist über vier Milliarden Jahre alt."],
          ["Felix", "Älter als jeder Dinosaurier? Unglaublich!"],
          ["Yuki", "Viel älter! Auf dem Mond gibt es weder Wind noch Regen – darum bleibt hier alles so, wie es ist."],
          ["Felix", "Oh, hallo {name}! Yuki sammelt schon den ganzen Tag Steine."],
          ["Yuki", "Und jeder erzählt uns etwas darüber, wie der Mond entstanden ist!"]
        ],
        [
          ["Felix", "Yuki, hast du heute schon trainiert?"],
          ["Yuki", "Ach, muss das sein? Hier ist doch alles so leicht."],
          ["Felix", "Genau deshalb! Wer wenig tragen muss, bekommt schwache Muskeln und Knochen."],
          ["Yuki", "Na gut, zwei Stunden aufs Laufband. Willst du mitmachen, {name}?"],
          ["Felix", "Kleiner Scherz – du hast ja noch eine Mission!"]
        ]
      ],
      guide: {
        order: ["fallversuch", "apollo", "mondstein"],
        hello: "Alles bestens, Bodenstation! Da sind wir, {name}! Warte, ich klettere auch runter.",
        welcome: "Willkommen auf dem Mond! Hier wiegst du fast nichts – spring ruhig mal! Und dann komm mit, ich zeig dir was.",
        wait: "Hüpf zu mir rüber, {name} – ich warte!",
        next: {
          fallversuch: "Am Tisch dort drüben machen wir einen berühmten Versuch. Komm mit!",
          apollo: "Gleich nebenan sind 1969 die ersten Menschen gelandet. Komm, das musst du sehen!",
          mondstein: "Und jetzt wird's sportlich: Unten im Krater wartet die Weitsprung-Bahn!"
        },
        arrive: {
          fallversuch: "Hier liegen ein Hammer und eine Feder. Was fällt wohl schneller? Probier es aus!",
          apollo: "Da wären wir! Stell dich in den Kreis am Seil – dann siehst du die Landestelle genau.",
          mondstein: "Nimm Anlauf und spring kurz vor der weißen Linie ab – mal sehen, wie weit du kommst!",
          wand: "An der Wand der Mondbasis siehst du alles, was du entdeckt hast.",
          rakete: "Steig über die Leiter ein – ich komme mit!"
        },
        quiz: "Das war die letzte Entdeckung! Psst – hörst du's knacken? Die Bodenstation meldet sich.",
        home: "Ab zur Rakete, {name} – der Mond war toll!",
        board: "Einsteigen bitte – ich klettere voraus!",
        react: {
          fallversuch: "Verrückt, oder? Ohne Luft fällt alles gleich schnell.",
          apollo: "Stell dir vor: Diese Fußspuren sind über 50 Jahre alt!",
          mondstein: "Ich glaube, das war ein Mond-Rekord!"
        },
        alone: "Alles klar, erkunde allein! Wenn du mich brauchst, komm einfach zu mir.",
        again: "🧭 Nora, zeig mir den Weg"
      },
      // Bewohner der Mondbasis (Ideen von ESA und NASA für eine echte Basis am Südpol des Mondes)
      npcs: [
        { name: "Kommandantin Lea", color: "#3b82f6", path: [[30, 38], [40, 34], [36, 28], [26, 32]],
          hello: "Hallo {name}! Ah, Nora hat dich mitgebracht. Ich bin Lea und leite die Mondbasis.",
          hint: "Ein Tipp von mir: „{ziel}“! Der Pfeil oben zeigt dir den Weg.",
          done: "Du hast alles entdeckt – da kann ich nur staunen!",
          facts: ["Unsere Kuppeln sind mit Mondstaub bedeckt. Er schützt uns vor Strahlung."] },
        { name: "Ingenieur Tom", color: "#f59e0b", path: [[60, 66], [68, 66]], work: true,
          hello: "Hi {name}, ich bin Tom! Pass auf, mein großer Drucker baut gerade eine neue Kuppel.",
          hint: "Mein Tipp für dich: „{ziel}“ – das musst du ausprobieren!",
          done: "Alles entdeckt? Respekt!",
          facts: ["Der Drucker baut die Kuppel Schicht für Schicht aus Mondstaub."] }
      ],
      discoveries: [
        { key: "fallversuch", icon: "🪶", title: "Hammer und Feder",
          text: "Beide sind gleichzeitig unten angekommen! Auf der Erde bremst die Luft die leichte Feder. Auf dem Mond gibt es keine Luft – darum fällt alles gleich schnell." },
        { key: "apollo", icon: "👣", title: "Die erste Mondlandung", gallery: ["mond-1.jpg", "mond-2.jpg", "mond-3.jpg"],
          text: "Im Juli 1969 landeten hier Neil Armstrong und Buzz Aldrin – die ersten Menschen auf dem Mond! Ihre Fußabdrücke sind noch heute da, denn auf dem Mond gibt es keinen Wind." },
        { key: "mondstein", icon: "🦘", title: "Der große Mondsprung", photo: "mond.jpg",
          text: "Was für ein Sprung! Auf dem Mond springst du 6-mal so hoch und weit wie auf der Erde, denn er zieht nur ein Sechstel so stark. Den Krater hat übrigens ein Brocken aus dem All geschlagen." }
      ],
      stations: {
        // action = Knopf an der Station · again = Knopf, um schon Entdecktes nochmal anzusehen · reach = Reichweite in Metern
        // hint = Tipp in der Liste „Meine Entdeckungen“ · small + auto = Fundstück: kleines Licht, Entdeckung beim Hingehen (Meter)
        apollo:      { label: "Landestelle von 1969", hint: "Stell dich in den Kreis am Seil vor der Mondfähre", again: "👣 Nochmal ansehen", auto: true },
        fallversuch: { label: "Hammer & Feder", hint: "Der Tisch mit Hammer und Feder steht neben der Apollo-Landestelle", action: "🪶 Hammer & Feder fallen lassen" },
        mondstein:   { label: "Mond-Weitsprung", hint: "Unten im Krater ist die Weitsprung-Bahn – nimm Anlauf und spring über die goldene Linie!", action: "🦘 Weitsprung starten" },
        // Tafelwand der Mondstation: keine Entdeckung (info), öffnet die Liste „Meine Entdeckungen“
        wand:        { label: "Wusstest du?", action: "📋 Meine Entdeckungen lesen", info: true, reach: 6.5 },
        // Extras zum Anschauen (extra = keine Mission: kein Licht, zählt nicht mit, Nora führt nicht hin)
        waage:       { label: "Frachtwaage", action: "⚖️ Auf die Waage stellen", extra: true },
        rakete:      { label: "Deine Rakete", action: "🚀 Einsteigen", home: true }
      },
      // Waage (Extra): eigenes Gewicht einstellen ({erde}) und ablesen, was die Waage auf dem Mond zeigt ({mond}); why = die Erklärung
      weigh: {
        text: "Stell ein, wie viel du auf der Erde wiegst: {erde} Kilo. Hier auf dem Mond zeigt die Waage nur {mond} Kilo!",
        why: "Dein Körper bleibt gleich – aber der Mond ist viel kleiner als die Erde und zieht nur ein Sechstel so stark an dir.",
        less: "➖ leichter", more: "➕ schwerer", done: "Fertig ✓"
      },
      // Mond-Weitsprung: 3 Versuche, Ziel ist die goldene Linie (4 m); ein durchsichtiger Erd-Astronaut springt zum Vergleich mit
      longJump: {
        start: "Mond-Weitsprung! Nimm Anlauf und spring kurz vor der weißen Linie ab. Ein Erd-Astronaut springt zum Vergleich mit.",
        label: "🦘 Versuch {n} von 3", best: "Bestweite: {m} m · Ziel: goldene Linie (4 m)",
        result: "🦘 {mond} m weit! Auf der Erde wären es nur {erde} m.",
        good: "Super Sprung! Schau mal, wie kurz der Erd-Astronaut gesprungen ist.",
        gold: "Über die goldene Linie! Auf dem Mond springst du 6-mal so weit wie auf der Erde.",
        foul: "Übergetreten! Spring kurz vor der weißen Linie ab.",
        noJump: "Du bist nur gelaufen. Drück kurz vor der weißen Linie auf Springen!",
        done: "Toll gesprungen! Auf dem Mond kommst du viel weiter als auf der Erde.",
        quit: "Weitsprung abgebrochen. Am Start kannst du neu beginnen."
      },
      // Hammer und Feder: erst vermuten, dann fallen lassen
      fall: { guess: { "q": "Was kommt zuerst unten an?", "a": ["Der Hammer", "Die Feder", "Beide gleichzeitig"], "c": 2 } },
      // {anzahl} = Zahl der Entdeckungen, {fragen} = Zahl der Funk-Fragen am Ende
      radio: {
        start: "Hier ist die Bodenstation! Willkommen auf dem Mond, {name}! Hier gibt es {anzahl} Dinge zu entdecken – der Pfeil oben führt dich hin.",
        landed: "Bodenstation an Rakete: Seid ihr gut auf dem Mond gelandet?",
        quizIntro: "Hallo {name}, hier ist die Bodenstation! Wir haben alles mitverfolgt: Hammer und Feder, die Landestelle und dein Riesensprung. Bevor ihr weiterfliegt, hab ich drei Fragen an dich. Bist du bereit?",
        back: "Willkommen zurück, {name}! Noch {rest} Entdeckungen – folge dem Pfeil oben.",
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
          hello: "Hallo {name}! Schön, dass Nora dich mitgebracht hat. Ich bin Mara und erforsche den Mars.",
          hint: "Das solltest du noch sehen: „{ziel}“! Folge einfach dem Pfeil oben.",
          done: "Wow, du hast alles entdeckt! Du bist ein echter Mars-Profi!",
          facts: ["In unserem Gewächshaus wächst Salat unter Lampen. Draußen würde er sofort erfrieren.", "Weißt du, warum der Mars rot ist? Im Staub steckt verrostetes Eisen. Probier es im Proben-Labor mit dem Magneten aus!"] },
        { name: "Techniker Bennett", color: "#3b82f6", path: [[14, 50], [19, 45], [12, 43]], work: true,
          hello: "Hi {name}! Ich bin Bennett – ich kümmere mich hier um Strom, Luft und Wasser.",
          hint: "Mein Tipp: „{ziel}“ – das macht richtig Spaß!",
          done: "Alles entdeckt? Da staunt sogar Mara!",
          facts: ["Unseren Strom machen Solarzellen. Nach einem Staubsturm muss ich sie putzen!"] }
      ],
      // Nora steigt mit aus der Rakete und führt das Kind (Sprechblase über ihrem Kopf); die Bewohner bleiben vor Ort
      // Figuren, die sich miteinander unterhalten (das Kind hört zu) – freiwillig, zählen nicht zur Mission
      crew: [
        {name: "Botaniker Leo", short: "Leo", color: "#16a34a", spot: [-7,43.5]},
        {name: "Pilotin Amira", short: "Amira", f: true, color: "#e11d48", spot: [-4.6,42.2]}
      ],
      talks: [
        [
          ["Leo", "Amira, die ersten Radieschen sind reif!"],
          ["Amira", "Echt? Auf dem Mars? Wie hast du das geschafft?"],
          ["Leo", "Mit besonderen Pflanzenlampen, Wasser aus dem Eis und Kohlendioxid aus der Marsluft – das lieben Pflanzen!"],
          ["Amira", "Hallo {name}! Leo redet den ganzen Tag mit seinen Pflanzen."],
          ["Leo", "Das stimmt gar nicht! Na gut … ein bisschen."]
        ],
        [
          ["Amira", "Leo, morgen fliege ich den Hubschrauber zum großen Krater."],
          ["Leo", "Bei so dünner Luft? Wie soll das gehen?"],
          ["Amira", "Mit riesigen Rotorblättern, die sich ganz schnell drehen. Der echte Mars-Hubschrauber Ingenuity hat es vorgemacht!"],
          ["Leo", "Bringst du mir von dort ein paar Steine mit?"],
          ["Amira", "Klar! Und du mir ein Radieschen."]
        ]
      ],
      guide: {
        order: ["abend", "rover", "curling"],
        hello: "Alles in Ordnung, Bodenstation! Da sind wir, {name}! Warte, ich komme auch runter.",
        welcome: "Willkommen auf dem Mars! Unten im Tal liegt der Außenposten von Mara und Bennett. Komm mit!",
        wait: "Hier lang, {name}! Ich warte auf dich.",
        next: {
          abend: "Komm, wir schauen uns einen Sonnenuntergang auf dem Mars an!",
          rover: "Jetzt darfst du selbst fahren: Der Rover wartet schon auf dich!",
          curling: "Und zum Schluss wird's rutschig – auf zum Eis-Krater!"
        },
        arrive: {
          abend: "Mit der Himmelskamera spulen wir bis zum Abend vor. Welche Farbe hat wohl der Sonnenuntergang?",
          rover: "Das ist der Rover-Leitstand! Fahr mit dem Rover los und sammle 3 Gesteinsproben.",
          curling: "Das ist der Eis-Krater! Auf dem Mars gibt es echtes Eis. Spiel eine Runde Eis-Curling – mal sehen, wie weit der Stein rutscht!",
          wand: "An dieser Wand siehst du alles, was du entdeckt hast.",
          rakete: "Steig über die Leiter ein – ich komme mit. Tschüss, Mars!"
        },
        quiz: "Das war die letzte Entdeckung! Moment – die Bodenstation funkt uns an.",
        home: "Komm, {name}, die Rakete wartet!",
        board: "Dann los – ich klettere voraus!",
        react: {
          abend: "Blau statt rot – hättest du das gedacht?",
          rover: "Spuren von Wasser auf dem Mars – echte Forscherarbeit!",
          curling: "Wie weit der Stein gerutscht ist!"
        },
        alone: "Alles klar, erkunde allein! Wenn du mich brauchst, komm einfach zu mir.",
        again: "🧭 Nora, zeig mir den Weg"
      },
      temp: { sun: -50, shade: -75, sunText: "☀️ Sonne – trotzdem eiskalt!", shadeText: "❄️ Schatten – noch kälter!" },
      discoveries: [
        { key: "abend", icon: "🌇", title: "Blauer Sonnenuntergang",
          text: "Auf dem Mars ist der Sonnenuntergang blau! Bei uns ist es umgekehrt: Am Tag ist der Himmel blau, am Abend rot. Das macht der feine Staub in der Marsluft." },
        { key: "rover", icon: "🤖", title: "Rover auf Spurensuche", gallery: ["mars-1.jpg", "mars-2.jpg"],
          text: "Kügelchen und Steine mit Schichten: Hier gab es vor langer Zeit Wasser! So etwas hat der echte Rover Opportunity gefunden. Und Staubteufel haben ihm oft die Solarzellen sauber gepustet." },
        { key: "curling", icon: "🥌", title: "Rutschpartie auf dem Mars-Eis",
          text: "Auf dem Mars gibt es Eis – sogar Krater voller Eis! Hier bist du leichter, und der Stein auch. Er drückt nicht so fest aufs Eis und rutscht darum fast dreimal so weit wie auf der Erde." }
      ],
      stations: {
        wand:      { label: "Wusstest du?", action: "📋 Meine Entdeckungen lesen", info: true, reach: 6.5 },
        rover:     { label: "Rover-Expedition", hint: "Am Rover-Leitstand unten im Tal startet die Rover-Expedition", action: "🤖 Rover-Expedition starten" },
        curling:   { label: "Eis-Curling", hint: "Im Eis-Krater hinter der Bohranlage wartet ein Eis-Curling-Spiel", action: "🥌 Eis-Curling spielen" },
        abend:     { label: "Wetterstation", hint: "An der Wetterstation auf der Hochebene steht eine Himmelskamera", action: "⏩ Zeit vorspulen bis zum Abend" },
        // Extras zum Anschauen (extra = keine Mission: kein Licht, zählt nicht mit, Nora führt nicht hin)
        waage:     { label: "Waage", action: "⚖️ Auf die Waage stellen", extra: true },
        rost:      { label: "Proben-Labor", action: "🧲 Magnet-Versuch starten", extra: true },
        rakete:    { label: "Deine Rakete", action: "🚀 Einsteigen", home: true }
      },
      // Waage (Extra): eigenes Gewicht einstellen ({erde}) und ablesen, was die Waage auf dem Mars zeigt ({mond}); why = die Erklärung
      weigh: {
        text: "Stell ein, wie viel du auf der Erde wiegst: {erde} Kilo. Hier auf dem Mars zeigt die Waage nur {mond} Kilo!",
        why: "Der Mars ist nur etwa halb so breit wie die Erde. Darum zieht er schwächer an dir – du bist hier nur gut ein Drittel so schwer.",
        less: "➖ leichter", more: "➕ schwerer", done: "Fertig ✓"
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
        doneBtn: "Was hat der Rover entdeckt? ▶",
        next: "Weiterfahren ▶", nextHint: "Weiter geht's – fahr zum nächsten gelben Ziel!",
        cam: ["🔬 Mikroskop-Kamera", "🪥 Schleifbürste: frisch geschliffen", "🧪 Bohrkern im Probenröhrchen"]
      },
      curling: {
        aim: "Eis-Curling! Ziel mit den Pfeiltasten ⬅️ ➡️ oder mit A und D auf die Zielscheibe.",
        aimTouch: "Eis-Curling! Ziel mit dem Joystick auf die Zielscheibe.",
        aimBtn: "🎯 Richtung passt!",
        power: "Der Pfeil zeigt den Schwung: Grün ist sanft, Rot ist kräftig. Drück im richtigen Moment!",
        throwBtn: "🥌 Jetzt schieben!",
        slide: "Der Stein rutscht und rutscht … auf dem Mars bremst er viel weniger als bei uns!",
        r3: "🎯 Volltreffer – mitten im Ziel!", r2: "Super, im Ziel!", r1: "Knapp – aber im Ziel!",
        short: "Zu kurz – gib etwas mehr Schwung!", long: "Zu weit! Auf dem Mars rutscht der Stein viel weiter – weniger Schwung reicht.",
        fact: "Hier ist der Stein leichter und drückt nicht so fest aufs Eis. Darum rutscht er fast dreimal so weit wie auf der Erde!",
        earth: "🥌 {mars} m gerutscht! Auf der Erde wären es mit dem gleichen Schwung nur {erde} m.",
        again: "🥌 Nochmal werfen (noch {n})", done: "Fertig ✓", quit: "Später"
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
        landed: "Bodenstation an Rakete: Alles in Ordnung bei der Landung auf dem Mars?",
        quizIntro: "Hallo {name}, hier ist die Bodenstation! Blauer Sonnenuntergang, eine Rover-Fahrt und Curling auf echtem Eis – was für ein Tag auf dem Mars! Ich hab noch drei Fragen an dich. Bist du bereit?",
        back: "Willkommen zurück, {name}! Noch {rest} Entdeckungen – folge dem Pfeil oben.",
        tooFar: "Hallo {name}, bitte nicht zu weit weg von der Rakete!",
        quizDone: "Hier hast du schon alles entdeckt, {name}! Lauf zur Rakete, wenn du weiterfliegen willst."
      },
      quiz: [
        { q: "Warum rutscht der Curling-Stein auf dem Mars so weit?", a: ["Weil das Eis dort warm ist", "Weil er dort leichter ist und weniger bremst", "Weil der Wind ihn schiebt"], c: 1, why: "Auf dem Mars wiegt alles nur gut ein Drittel. Der Stein drückt weniger aufs Eis – und bremst darum weniger." },
        { q: "Welche Farbe hat der Sonnenuntergang auf dem Mars?", a: ["Rot", "Blau", "Grün"], c: 1, why: "Der feine Staub in der dünnen Marsluft lässt den Himmel um die Abendsonne blau leuchten." },
        { q: "Was hat dein Rover entdeckt?", a: ["Spuren von altem Wasser", "Einen Marsmenschen", "Einen Goldschatz"], c: 0, why: "Die Kügelchen und die Schichten im Stein zeigen: Früher gab es auf dem Mars Wasser." }
      ]
    },

    merkur: {
      gravity: 3.7, jump: 0.3,
      temp: { sun: 430, shade: -180, sunText: "☀️ Sonne – heißer als ein Backofen!", shadeText: "❄️ Schatten – eiskalt!" },
      // Nora steigt mit aus der Rakete und führt das Kind (Sprechblase über ihrem Kopf); die Bewohner bleiben vor Ort
      // Figuren, die sich miteinander unterhalten (das Kind hört zu) – freiwillig, zählen nicht zur Mission
      crew: [
        {name: "Ingenieurin Ida", short: "Ida", f: true, color: "#f59e0b", spot: [9.5,49.5]},
        {name: "Funker Mats", short: "Mats", color: "#6366f1", spot: [11.6,47.8]}
      ],
      talks: [
        [
          ["Ida", "Mats, unser Sonnenschild hält 430 Grad aus!"],
          ["Mats", "Puh, gut so. Ohne ihn würden wir hier gebraten."],
          ["Ida", "Dafür ist es im Schatten so kalt, dass dort sogar Eis liegt."],
          ["Mats", "Hallo {name}! Heiß und eiskalt gleichzeitig – verrückt, oder?"],
          ["Ida", "Darum steht unsere Station unten im Krater, schön im Schatten."]
        ],
        [
          ["Mats", "Ida, weißt du, wie lange hier ein Tag dauert?"],
          ["Ida", "Vom Sonnenaufgang bis zum nächsten? Bestimmt ganz schön lange."],
          ["Mats", "176 Erdentage! Die Sonne kriecht hier ganz langsam über den Himmel."],
          ["Ida", "Da hat man ja ewig Zeit bis zum Feierabend!"],
          ["Mats", "Ich funke der Erde trotzdem jeden Tag, dass bei uns alles in Ordnung ist."]
        ]
      ],
      guide: {
        order: ["temperatur", "sonne", "krater"],
        hello: "Alles heil, Bodenstation – aber heiß! Da sind wir, {name}! Schnell aus der Sonne, ich komme!",
        welcome: "Willkommen auf dem Merkur! In der Sonne ist es hier heißer als in einem Backofen. Komm mit!",
        wait: "Hier lang, {name}! Ich warte auf dich.",
        next: {
          temperatur: "Komm mit zum Eis-Lager – da wartet eine eilige Lieferung!",
          sonne: "Jetzt geht's hoch hinaus: Oben auf dem Sonnenturm wartet ein Fernrohr!",
          krater: "Zum Schluss lassen wir es krachen – komm zum Einschlag-Krater!"
        },
        arrive: {
          temperatur: "Kofi braucht Eis für sein Labor. Bring es zum großen Felsen – aber pass auf, in der Sonne schmilzt es!",
          sonne: "Kletter hoch zum Fernrohr – es hat einen Filter. Schau, wie riesig die Sonne von hier aus ist!",
          krater: "Lass einen Brocken aus dem All fallen und schau, was passiert!",
          wand: "An der Wand der Station siehst du alles, was du entdeckt hast.",
          rakete: "Steig über die Leiter ein – ich komme mit. Raus aus der Hitze!"
        },
        quiz: "Das war's – alles entdeckt! Psst, die Bodenstation ist dran.",
        home: "Komm, {name}, raus aus der Hitze – zur Rakete!",
        board: "Schnell rein in die kühle Rakete – ich klettere voraus!",
        react: {
          temperatur: "Puh, gerade noch rechtzeitig, bevor alles geschmolzen ist!",
          sonne: "So riesig sieht die Sonne nur von hier aus!",
          krater: "Bumm! Kein Wunder, dass der Merkur voller Krater ist."
        },
        alone: "Alles klar, erkunde allein! Wenn du mich brauchst, komm einfach zu mir.",
        again: "🧭 Nora, zeig mir den Weg"
      },
      npcs: [
        { name: "Forscher Kofi", color: "#b45309", path: [[-6, 58], [6, 56], [2, 52]],
          hello: "Hallo {name}! Nora hat mir schon von dir erzählt. Ich bin Kofi – gut, dass du einen Raumanzug trägst!",
          hint: "Unbedingt ansehen: „{ziel}“! Der Pfeil oben zeigt dir den Weg.",
          done: "Du hast alles entdeckt! Jetzt weißt du mehr über den Merkur als fast alle Menschen.",
          facts: ["Unsere Station steht unten im Krater. Der Kraterrand wirft seinen Schatten auf uns."] }
      ],
      discoveries: [
        { key: "temperatur", icon: "🧊", title: "Backofen und Eisschrank",
          text: "Das Eis ist angekommen! In der Sonne wird es auf dem Merkur 430 °C heiß, im Schatten −180 °C. Darum gibt es dort sogar Eis: in Kratern, in die nie die Sonne scheint." },
        { key: "sonne", icon: "☀️", title: "Die riesige Sonne",
          text: "Vom Merkur aus sieht die Sonne fast dreimal so breit aus wie bei uns! Kein Planet ist ihr näher. Schau aber niemals ohne Filter in die Sonne!" },
        { key: "krater", icon: "☄️", title: "Einschlag!", photo: "merkur-1.jpg",
          text: "Der Brocken ist eingeschlagen, ohne zu verglühen! Der Merkur hat keine Luft, die ihn bremst. Darum ist er voller Krater – wie unser Mond." }
      ],
      stations: {
        wand:       { label: "Wusstest du?", action: "📋 Meine Entdeckungen lesen", info: true, reach: 6.5 },
        temperatur: { label: "Eis-Lieferung", hint: "Am Eis-Lager neben dem Sonnenturm wartet ein Eisblock – bring ihn im Schatten zum großen Felsen", action: "🧊 Eis-Lieferung starten" },
        sonne:      { label: "Sonnenturm", hint: "Oben auf dem Sonnenturm steht ein Fernrohr mit Sonnenfilter", action: "🔭 Durchschauen" },
        krater:     { label: "Einschlag-Messfeld", hint: "Probier den Einschlag-Versuch am Messpult aus", action: "☄️ Einschlag-Versuch starten" },
        // Extras zum Anschauen (extra = keine Mission: kein Licht, zählt nicht mit, Nora führt nicht hin)
        waage:      { label: "Waage", action: "⚖️ Auf die Waage stellen", extra: true },
        groesse:    { label: "Größenvergleich", action: "🪐 Größen vergleichen", extra: true },
        rakete:     { label: "Deine Rakete", action: "🚀 Einsteigen", home: true }
      },
      // Waage (Extra): eigenes Gewicht einstellen ({erde}) und ablesen, was die Waage auf dem Merkur zeigt ({mond}); why = die Erklärung
      weigh: {
        text: "Stell ein, wie viel du auf der Erde wiegst: {erde} Kilo. Hier auf dem Merkur zeigt die Waage nur {mond} Kilo!",
        why: "Der Merkur ist der kleinste Planet. Er zieht nur gut ein Drittel so stark an dir wie die Erde.",
        less: "➖ leichter", more: "➕ schwerer", done: "Fertig ✓"
      },
      // Größenvergleich (Extra): Erklärung zu den Kugeln am Gestell neben der Tafelwand
      sizes: { text: "Die Kugeln zeigen, wie groß die Himmelskörper im Vergleich sind. Der Merkur ist der kleinste Planet – nur ein bisschen größer als unser Mond. Die Erde ist mehr als doppelt so breit.", done: "Fertig ✓" },
      // Eis-Lieferung: Eisblock vom Eis-Lager zum Kühlschrank am großen Felsen tragen; in der Sonne schmilzt er, im Schatten (blau) nicht
      iceRun: {
        start: "Hier ist dein Eisblock! Bring ihn zum Kühlschrank am großen Felsen. Lauf durch die blauen Schatten – in der Sonne schmilzt das Eis!",
        label: "🧊 Eisblock", sun: "☀️ Sonne: 430 °C – dein Eis schmilzt!", cool: "❄️ Schatten: −180 °C – das Eis bleibt hart",
        melted: "Oh nein, geschmolzen! Hier ist ein neuer Eisblock. Bleib länger in den blauen Schatten!",
        quit: "Eis-Lieferung abgebrochen. Am Eis-Lager kannst du neu beginnen."
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
        running: "Da kommt er – schau nach oben! Wir zeigen es dir in Zeitlupe.",
        end: "Eingeschlagen – ohne zu verglühen! Und schau: ein echter Krater mit Wall. So sind die Krater auf dem Merkur entstanden.",
        again: "☄️ Nochmal", done: "Fertig ✓"
      },
      radio: {
        start: "Hier ist die Bodenstation! Willkommen auf dem Merkur, {name}! Hier gibt es {anzahl} Dinge zu entdecken – der Pfeil oben führt dich hin.",
        landed: "Bodenstation an Rakete: Seid ihr heil auf dem Merkur angekommen? Dort ist es glühend heiß!",
        quizIntro: "Hallo {name}, hier ist die Bodenstation! Eis geliefert, die riesige Sonne gesehen und einen Einschlag beobachtet – richtig gute Arbeit! Jetzt hab ich drei Fragen an dich. Bist du bereit?",
        back: "Willkommen zurück, {name}! Noch {rest} Entdeckungen – folge dem Pfeil oben.",
        tooFar: "Hallo {name}, bitte nicht zu weit weg von der Rakete!",
        quizDone: "Hier hast du schon alles entdeckt, {name}! Lauf zur Rakete, wenn du weiterfliegen willst."
      },
      quiz: [
        { q: "Warum verglühen Brocken aus dem All auf dem Merkur nicht?", a: ["Weil es dort keine Luft gibt", "Weil es dort zu kalt ist", "Weil sie zu klein sind"], c: 0, why: "Ohne Luft bremst und erhitzt nichts die Brocken – sie schlagen ein und hinterlassen Krater." },
        { q: "Warum ist es auf dem Merkur in der Sonne glühend heiß und im Schatten eiskalt?", a: ["Weil keine Luft die Wärme verteilt", "Weil er sich so schnell dreht", "Weil dort Eis liegt"], c: 0, why: "Ohne Luft wird die Wärme nicht verteilt: In der Sonne sind es 430 °C, im Schatten −180 °C." },
        { q: "Wie sieht die Sonne vom Merkur aus?", a: ["Kleiner als bei uns", "Genauso groß wie bei uns", "Fast dreimal so breit"], c: 2, why: "Der Merkur ist der Sonne am nächsten – darum sieht sie dort riesig aus." }
      ]
    },

    venus: {
      gravity: 8.87, jump: 0.13,
      temp: { sun: 465, shade: 465, sunText: "🔥 Überall glühend heiß!", shadeText: "🔥 Auch im Schatten glühend heiß!" },
      // Sara wohnt im Luftschiff oben in den Wolken und ist mit herabgekommen
      npcs: [
        { name: "Pilotin Sara", color: "#f97316", path: [[-20, 64], [-8, 64], [-14, 60]],
          hello: "Hallo {name}! Du bist mit Nora unterwegs? Toll! Ich bin Sara und fliege das Luftschiff oben in den Wolken.",
          hint: "Schau dir noch das an: „{ziel}“! Folge einfach den Leitlichtern.",
          done: "Du hast alles entdeckt! Jetzt kennst du den heißesten Planeten.",
          facts: ["Wir wohnen im Luftschiff, 50 Kilometer hoch in den Wolken. Dort ist es angenehm warm."] }
      ],
      // Nora steigt mit aus der Rakete und führt das Kind (Sprechblase über ihrem Kopf); die Bewohner bleiben vor Ort
      // Figuren, die sich miteinander unterhalten (das Kind hört zu) – freiwillig, zählen nicht zur Mission
      crew: [
        {name: "Robotikerin Lina", short: "Lina", f: true, color: "#14b8a6", spot: [21,17.2]},
        {name: "Chemiker Elias", short: "Elias", color: "#ca8a04", spot: [23.2,18.6]}
      ],
      talks: [
        [
          ["Lina", "Elias, schau, mein Wind-Rover dreht schon wieder seine Runde!"],
          ["Elias", "Ganz ohne Computer? Wie findet der denn seinen Weg?"],
          ["Lina", "Mit Zahnrädern und Hebeln, wie eine alte Uhr. Elektronik würde bei dieser Hitze sofort kaputtgehen."],
          ["Elias", "Hallo {name}! Lina baut die einzigen Roboter, die hier unten durchhalten."],
          ["Lina", "Und sein Windrad gibt ihm Kraft. Der Wind ist hier langsam, aber so stark wie Wasser."]
        ],
        [
          ["Elias", "Lina, ich habe die Wolken untersucht. Die sind aus Schwefelsäure!"],
          ["Lina", "Igitt! Da möchte ich nicht im Regen stehen."],
          ["Elias", "Keine Sorge, der Regen verdampft, bevor er unten ankommt – dafür ist es viel zu heiß."],
          ["Lina", "Weißt du, was auch verrückt ist, {name}? Die Venus dreht sich rückwärts!"],
          ["Elias", "Darum geht hier die Sonne im Westen auf – wenn man sie durch die Wolken sehen könnte."]
        ]
      ],
      guide: {
        order: ["venera", "hitze", "druck"],
        hello: "Wir hören dich, Bodenstation – die Sicht ist schlecht! Da sind wir, {name}! Bleib stehen, ich komme!",
        welcome: "Willkommen auf der Venus! Zum Glück tragen wir Spezialanzüge. Komm mit!",
        wait: "Hier lang, {name}! Folge den Lichtern zu mir.",
        next: {
          venera: "Komm mit zum Radar-Peiler – wir gehen auf Schatzsuche!",
          hitze: "Folge den Leitlichtern – am Klima-Messturm wartet ein spannender Versuch!",
          druck: "Und jetzt wird's laut: Am Druck-Prüfstand knirscht es gleich!"
        },
        arrive: {
          venera: "Irgendwo im Dunst steht eine alte Landesonde: Venera 13. Such sie mit dem Radar – bevor die Kühlung deines Anzugs leer ist!",
          hitze: "Das ist der Klima-Messturm. Was passiert wohl, wenn wir die Wolken wegschieben?",
          druck: "Hier siehst du, wie stark die Venusluft drückt. Schau genau auf die Dose!",
          wand: "Das ist der Außenposten. An der Wand siehst du alles, was du entdeckt hast.",
          rakete: "Steig ein – ich komme mit. Raus aus der Hitze!"
        },
        quiz: "Das war die letzte Entdeckung! Hörst du? Die Bodenstation meldet sich.",
        home: "Komm, {name}, zurück zur Rakete – den Leitlichtern nach!",
        board: "Rein in die Rakete – ich klettere voraus. Raus aus der Hitze!",
        react: {
          venera: "Unglaublich – die Sonde liegt hier schon seit 1982!",
          hitze: "Die Wolken sind wie eine dicke Decke – darum ist es hier so heiß.",
          druck: "Arme Dose! Gut, dass wir Spezialanzüge tragen."
        },
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
        // Extras zum Anschauen (extra = keine Mission: kein Licht, zählt nicht mit, Nora führt nicht hin)
        waage:      { label: "Waage", action: "⚖️ Auf die Waage stellen", extra: true },
        groesse:    { label: "Größenvergleich", action: "🪐 Größen vergleichen", extra: true },
        rakete:     { label: "Deine Rakete", action: "🚀 Einsteigen", home: true }
      },
      // Waage (Extra): eigenes Gewicht einstellen ({erde}) und ablesen, was die Waage auf der Venus zeigt ({mond}); why = die Erklärung
      weigh: {
        text: "Stell ein, wie viel du auf der Erde wiegst: {erde} Kilo. Hier auf der Venus zeigt die Waage {mond} Kilo – fast dasselbe!",
        why: "Die Venus ist fast genauso groß wie die Erde. Darum zieht sie fast genauso stark an dir.",
        less: "➖ leichter", more: "➕ schwerer", done: "Fertig ✓"
      },
      // Größenvergleich (Extra): Erklärung zu den Kugeln am Gestell neben der Tafelwand
      sizes: { text: "Die Kugeln zeigen, wie groß die Himmelskörper im Vergleich sind. Die Venus ist fast genauso groß wie die Erde – man nennt sie auch die Schwester der Erde. Unser Mond ist viel kleiner.", done: "Fertig ✓" },
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
        landed: "Bodenstation an Rakete: Hört ihr mich? Wie ist die Sicht auf der Venus?",
        quizIntro: "Hallo {name}, hier ist die Bodenstation! Du hast Venera 13 im Dunst gefunden, die Hitze gemessen und gesehen, wie die Dose zerquetscht wird. Ich hab noch drei Fragen an dich. Bist du bereit?",
        back: "Willkommen zurück, {name}! Noch {rest} Entdeckungen – folge dem Pfeil oben.",
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
          hello: "Hallo {name}! Bist du mit Nora unterwegs? Ich bin Jana und trainiere hier für meinen ersten Flug ins All.",
          hint: "Schau dir noch das an: „{ziel}“! Folge dem Weg um den See.",
          done: "Du hast alles entdeckt! Siehst du jetzt, wie besonders unsere Erde ist?",
          facts: ["Das Training für einen Flug ins All dauert mehrere Jahre!"] }
      ],
      // Nora steigt mit aus der Rakete und führt das Kind (Sprechblase über ihrem Kopf); die Bewohner bleiben vor Ort
      // Figuren, die sich miteinander unterhalten (das Kind hört zu) – freiwillig, zählen nicht zur Mission
      crew: [
        {name: "Biologin Hanna", short: "Hanna", f: true, color: "#22c55e", spot: [-12,26]},
        {name: "Meteorologe Paul", short: "Paul", color: "#3b82f6", spot: [-9.8,27.4]}
      ],
      talks: [
        [
          ["Hanna", "Paul, im See habe ich heute drei Libellenlarven gefunden!"],
          ["Paul", "Kein Wunder – gestern hat es ordentlich geregnet."],
          ["Hanna", "Weißt du was, {name}? Das Wasser im See war vielleicht schon einmal in einer Wolke."],
          ["Paul", "Genau! Es verdunstet, regnet herunter und fließt zurück – immer im Kreis."],
          ["Hanna", "Vielleicht hat sogar ein Dinosaurier schon davon getrunken!"]
        ],
        [
          ["Paul", "Hanna, heute Nacht gab es Sternschnuppen!"],
          ["Hanna", "Das sind doch kleine Brocken aus dem All, oder?"],
          ["Paul", "Richtig. Unsere Luft bremst sie so stark, dass sie verglühen. Auf dem Merkur schlagen sie einfach ein."],
          ["Hanna", "Dann ist die Luft wie ein Schutzschild für alles, was hier lebt."],
          ["Paul", "Darum passen wir gut auf unsere Erde auf, {name}!"]
        ]
      ],
      guide: {
        order: ["wald", "tag", "luft"],
        hello: "Gut gelandet, Bodenstation – wie schön, wieder hier zu sein! Da sind wir, {name}! Warte, ich komme.",
        welcome: "Willkommen auf der Erde! Heute siehst du, wie besonders unser Planet ist. Komm mit!",
        wait: "Hier lang, {name}! Ich warte auf dich.",
        next: {
          wald: "Komm, am Waldrand und am See gibt es Tiere zu fotografieren!",
          tag: "Weiter auf dem Rundweg: An der Sonnenuhr spulen wir einen ganzen Tag vor!",
          luft: "Und jetzt ein Gedankenspiel: Was wäre, wenn die Erde keine Luft hätte?"
        },
        arrive: {
          wald: "Hier leben viele Tiere und Pflanzen. Fotografiere 5 verschiedene Lebewesen!",
          tag: "Da ist die Sonnenuhr! Pass auf, wohin der Schatten wandert.",
          luft: "Hier probieren wir es aus – was passiert wohl mit dem Himmel?",
          wand: "Im Besucherzentrum siehst du an der Wand alles, was du entdeckt hast.",
          rakete: "Steig ein – ich komme mit. Auf zu neuen Welten!"
        },
        quiz: "Das war die letzte Entdeckung! Moment – da funkt die Bodenstation.",
        home: "Komm, {name}, die Rakete wartet auf uns!",
        board: "Auf zu neuen Welten – ich klettere voraus!",
        react: {
          wald: "So viel Leben – das gibt es nur auf unserer Erde!",
          tag: "Die Sonne wandert gar nicht – wir drehen uns!",
          luft: "Ohne Luft wär's ganz schön ungemütlich hier, oder?"
        },
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
        // Extras zum Anschauen (extra = keine Mission: kein Licht, zählt nicht mit, Nora führt nicht hin)
        waage:     { label: "Waage", action: "⚖️ Auf die Waage stellen", extra: true },
        groesse:   { label: "Größenvergleich", action: "🪐 Größen vergleichen", extra: true },
        rakete:    { label: "Deine Rakete", action: "🚀 Einsteigen", home: true }
      },
      // Waage (Extra): eigenes Gewicht einstellen ({erde}) und ablesen, was die Waage auf der Erde zeigt ({mond}); why = die Erklärung
      weigh: {
        text: "Stell ein, wie viel du wiegst: {erde} Kilo. Hier auf der Erde zeigt die Waage genau {mond} Kilo.",
        why: "Auf anderen Planeten zeigt dieselbe Waage etwas anderes – probier es dort aus!",
        less: "➖ leichter", more: "➕ schwerer", done: "Fertig ✓"
      },
      // Größenvergleich (Extra): Erklärung zu den Kugeln am Gestell neben der Tafelwand
      sizes: { text: "Die Kugeln zeigen, wie groß die Planeten im Vergleich sind. Merkur, Venus, Erde und Mars sind aus Gestein – und die Erde ist der größte von ihnen! Der Mars ist nur etwa halb so breit.", done: "Fertig ✓" },
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
        landed: "Bodenstation an Rakete: Willkommen zu Hause! Seid ihr gut gelandet?",
        quizIntro: "Hallo {name}, hier ist die Bodenstation! Tiere fotografiert, einen ganzen Tag vorgespult und die Luft erforscht – jetzt kennst du unsere Erde richtig gut! Drei Fragen hab ich noch. Bist du bereit?",
        back: "Willkommen zurück, {name}! Noch {rest} Entdeckungen – folge dem Pfeil oben.",
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
        start: "{name}, auf dem Jupiter kann man nicht landen – er hat keinen festen Boden. Steuere deine Kapsel durch die {anzahl} leuchtenden Mess-Tore!",
        quizIntro: "Hallo {name}, hier ist die Bodenstation! Deine Kapsel hat alle Messungen geschickt: der Riese, der Rote Fleck – und kein Boden in Sicht. Ich hab drei Fragen dazu. Bist du bereit?",
        back: "Deine Kapsel ist wieder beim Jupiter, {name}! Noch {rest} Mess-Tore.",
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
      flight: { who: "🎧 Flugleiterin Nora", gates: ["Achtung, Eisbrocken! Das erste Tor misst, woraus die Ringe bestehen.", "Nächstes Tor: Es prüft, wie schwer der Saturn ist – rate mal!", "Letztes Tor über dem Nordpol – dort dreht sich ein seltsamer Sturm!"] },
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
        start: "{name}, deine Sonde fliegt mitten durch die Ringe des Saturn. Flieg durch die {anzahl} Mess-Tore und weich den Eisbrocken aus!",
        quizIntro: "Hallo {name}, hier ist die Bodenstation! Deine Sonde ist heil durch die Ringe gekommen – Glückwunsch! Ich hab drei Fragen dazu. Bist du bereit?",
        back: "Deine Sonde ist wieder beim Saturn, {name}! Noch {rest} Mess-Tore.",
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
      flight: { who: "🎧 Flugleiterin Nora", gates: ["Siehst du's? Der Uranus liegt auf der Seite! Das erste Tor schaut genau hin.", "Das nächste Tor misst, woraus der Uranus besteht.", "Letztes Tor! Brr – es misst die Temperatur."] },
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
        start: "{name}, Uranus ist ein Riese aus eisigen Gasen – landen geht nicht. Steuere deine Sonde durch die {anzahl} Mess-Tore!",
        quizIntro: "Hallo {name}, hier ist die Bodenstation! Brr, die Messwerte vom Uranus sind eisig! Ich hab drei Fragen dazu. Bist du bereit?",
        back: "Deine Sonde ist wieder beim Uranus, {name}! Noch {rest} Mess-Tore.",
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
      flight: { who: "🎧 Flugleiterin Nora", gates: ["Spürst du den Wind? Erstes Tor voraus – lenk dagegen!", "Nächstes Tor: Wie weit sind wir von der Sonne weg?", "Letztes Tor! Es erzählt, wie der Neptun gefunden wurde – zuerst nur durch Rechnen!"] },
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
        start: "{name}, du bist am äußersten Planeten. Steuere Voyager 2 durch die {anzahl} Mess-Tore – der Sturm drückt dich zur Seite!",
        quizIntro: "Hallo {name}, hier ist die Bodenstation! Trotz Sturm hat Voyager 2 alle Tore geschafft – super gesteuert! Ich hab drei Fragen dazu. Bist du bereit?",
        back: "Deine Sonde ist wieder beim Neptun, {name}! Noch {rest} Mess-Tore.",
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
      flight: { who: "🎧 Flugleiterin Nora", gates: ["Hitzeschild bereit? Erstes Tor voraus!", "Das nächste Tor stoppt die Zeit, die das Licht bis zur Erde braucht.", "Letztes Tor! Es schaut auf dunkle Flecken."] },
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
        start: "{name}, auf der Sonne kann niemand landen – sie ist glühendes Gas. Flieg mit deiner Hitzeschild-Sonde durch die {anzahl} Mess-Tore!",
        quizIntro: "Hallo {name}, hier ist die Bodenstation! Dein Hitzeschild hat gehalten – und alle Messungen sind da! Ich hab drei Fragen dazu. Bist du bereit?",
        back: "Deine Sonde ist wieder bei der Sonne, {name}! Noch {rest} Mess-Tore.",
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
    ]
  }
};
