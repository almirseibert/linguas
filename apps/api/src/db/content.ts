import type { LangCode } from "@passaporte/shared";

/**
 * Conteúdo pedagógico base (original, escrito para o projeto).
 * A IA gera material novo por cima disso; aqui fica o mínimo para o dia 1 funcionar.
 */

export interface PhaseSeed {
  order: number;
  name: string;
  description: string;
  week_start: number;
  week_end: number | null;
}

export const PHASES: PhaseSeed[] = [
  {
    order: 1,
    name: "Fundação",
    description:
      "Entender mais do que falar. Muito input fácil (ouvir e ler o que você quase entende), frases de sobrevivência e shadowing curto todo dia.",
    week_start: 1,
    week_end: 4,
  },
  {
    order: 2,
    name: "Expansão",
    description:
      "Começar a produzir: contar o seu dia, conversar com a IA sobre a rotina, transformar cada erro em cartão de revisão.",
    week_start: 5,
    week_end: 12,
  },
  {
    order: 3,
    name: "Consolidação",
    description:
      "Conversa real em ritmo natural: opiniões, histórias, planos. Menos legenda, mais conversa — com a IA, em família e com nativos.",
    week_start: 13,
    week_end: null,
  },
];

type Pair = [string, string];

interface LangContent {
  phrases: Record<number, Pair[]>;
  texts: Record<number, { title: string; body: string; pt: string }[]>;
  resources: { category: string; name: string; url: string; description: string }[];
}

export const CONTENT: Record<LangCode, LangContent> = {
  en: {
    phrases: {
      1: [
        ["Could you say that again, please?", "Você pode repetir, por favor?"],
        ["Sorry, I don't understand.", "Desculpe, não entendi."],
        ["What does this word mean?", "O que essa palavra significa?"],
        ["Can you speak more slowly?", "Você pode falar mais devagar?"],
        ["How do you say this in English?", "Como se diz isso em inglês?"],
        ["I'm learning English with my family.", "Estou aprendendo inglês com a minha família."],
        ["I'd like a coffee, please.", "Eu queria um café, por favor."],
        ["Where is the bathroom?", "Onde fica o banheiro?"],
        ["How much is this?", "Quanto custa isso?"],
        ["Nice to meet you.", "Prazer em te conhecer."],
      ],
      2: [
        ["How was your day?", "Como foi o seu dia?"],
        ["It was a long day, but it was good.", "Foi um dia longo, mas foi bom."],
        ["Can you pass me the salt?", "Você pode me passar o sal?"],
        ["What are we having for dinner?", "O que vamos jantar?"],
        ["I'm tired, but I'm happy.", "Estou cansado, mas estou feliz."],
        ["What did you do today?", "O que você fez hoje?"],
        ["I worked all morning and then I went to the gym.", "Trabalhei a manhã toda e depois fui à academia."],
        ["Let's watch something together.", "Vamos assistir alguma coisa juntos."],
        ["I think so, but I'm not sure.", "Acho que sim, mas não tenho certeza."],
      ],
      3: [
        ["What do you think about it?", "O que você acha disso?"],
        ["To be honest, I see it differently.", "Para ser sincero, eu vejo diferente."],
        ["That reminds me of something that happened last year.", "Isso me lembra uma coisa que aconteceu ano passado."],
        ["If I had more time, I would travel more.", "Se eu tivesse mais tempo, viajaria mais."],
        ["What are you looking forward to this year?", "O que você está esperando ansiosamente este ano?"],
        ["I used to think that, but I changed my mind.", "Eu pensava isso, mas mudei de ideia."],
        ["Tell me more about that.", "Me conta mais sobre isso."],
        ["It depends on the situation.", "Depende da situação."],
      ],
    },
    texts: {
      1: [
        {
          title: "My morning",
          body: "I wake up at seven. I drink a glass of water. Then I make coffee. I eat bread with butter. I look at my phone for five minutes. Then I take a shower and I go to work.",
          pt: "Eu acordo às sete. Bebo um copo de água. Depois faço café. Como pão com manteiga. Olho o celular por cinco minutos. Depois tomo banho e vou trabalhar.",
        },
      ],
      2: [
        {
          title: "A busy Saturday",
          body: "Last Saturday was busy. In the morning, we went to the market and bought fruit and vegetables. My sister wanted to buy flowers too. In the afternoon, I cleaned the house while my parents cooked lunch. At night, we watched a movie together. It was a simple day, but I liked it a lot.",
          pt: "Sábado passado foi cheio. De manhã fomos à feira e compramos frutas e verduras. Minha irmã quis comprar flores também. À tarde limpei a casa enquanto meus pais cozinhavam o almoço. À noite assistimos a um filme juntos. Foi um dia simples, mas gostei muito.",
        },
      ],
      3: [
        {
          title: "Learning together",
          body: "When we started learning together, I didn't expect it to change our dinners. Now someone always brings a new phrase to the table, and we end up laughing at our mistakes. Honestly, the laughing is what keeps us going. Nobody wants to be the one who skipped practice that day.",
          pt: "Quando começamos a aprender juntos, eu não esperava que isso mudasse nossos jantares. Agora alguém sempre traz uma frase nova para a mesa, e acabamos rindo dos nossos erros. Sinceramente, as risadas são o que nos mantém motivados. Ninguém quer ser quem pulou a prática naquele dia.",
        },
      ],
    },
    resources: [
      { category: "Ouvir", name: "BBC Learning English", url: "https://www.bbc.co.uk/learningenglish", description: "Áudios e vídeos curtos por nível, gratuitos." },
      { category: "Ouvir", name: "VOA Learning English", url: "https://learningenglish.voanews.com", description: "Notícias em inglês lento e simples, com texto." },
      { category: "Ler", name: "Tatoeba", url: "https://tatoeba.org", description: "Milhões de frases com tradução e áudio de nativos." },
      { category: "Assistir", name: "Language Reactor", url: "https://www.languagereactor.com", description: "Legenda dupla na Netflix/YouTube (extensão do Chrome)." },
    ],
  },

  es: {
    phrases: {
      1: [
        ["¿Puedes repetirlo, por favor?", "Você pode repetir, por favor?"],
        ["Perdona, no lo entiendo.", "Desculpe, não entendi."],
        ["¿Qué significa esta palabra?", "O que essa palavra significa?"],
        ["¿Puedes hablar más despacio?", "Você pode falar mais devagar?"],
        ["¿Cómo se dice esto en español?", "Como se diz isso em espanhol?"],
        ["Estoy aprendiendo español con mi familia.", "Estou aprendendo espanhol com a minha família."],
        ["Me pones un café con leche, por favor.", "Me vê um café com leite, por favor."],
        ["¿Dónde están los servicios?", "Onde fica o banheiro?"],
        ["¿Cuánto cuesta esto?", "Quanto custa isso?"],
        ["Encantado de conocerte.", "Prazer em te conhecer."],
      ],
      2: [
        ["¿Qué tal el día?", "Como foi o dia?"],
        ["Ha sido un día largo, pero bien.", "Foi um dia longo, mas bom."],
        ["¿Me pasas la sal?", "Você me passa o sal?"],
        ["¿Qué hay de cenar?", "O que tem para jantar?"],
        ["Estoy cansado, pero contento.", "Estou cansado, mas contente."],
        ["¿Qué habéis hecho hoy?", "O que vocês fizeram hoje?"],
        ["He trabajado toda la mañana y luego he ido al gimnasio.", "Trabalhei a manhã toda e depois fui à academia."],
        ["¿Vemos algo juntos?", "Vamos assistir alguma coisa juntos?"],
        ["Vale, me parece bien.", "Tá bom, me parece bem."],
      ],
      3: [
        ["¿Tú qué opinas?", "O que você acha?"],
        ["Si te soy sincero, yo lo veo de otra manera.", "Para ser sincero, eu vejo de outra forma."],
        ["Eso me recuerda a algo que pasó el año pasado.", "Isso me lembra algo que aconteceu ano passado."],
        ["Si tuviera más tiempo, viajaría más.", "Se eu tivesse mais tempo, viajaria mais."],
        ["Antes pensaba eso, pero he cambiado de opinión.", "Antes eu pensava isso, mas mudei de opinião."],
        ["Cuéntame más.", "Me conta mais."],
        ["Depende de la situación.", "Depende da situação."],
        ["¡Qué guay!", "Que legal!"],
      ],
    },
    texts: {
      1: [
        {
          title: "Mi mañana",
          body: "Me levanto a las siete. Bebo un vaso de agua. Luego hago café. Desayuno pan con tomate y aceite. Miro el móvil cinco minutos. Después me ducho y voy al trabajo.",
          pt: "Eu me levanto às sete. Bebo um copo de água. Depois faço café. Tomo café da manhã com pão com tomate e azeite. Olho o celular cinco minutos. Depois tomo banho e vou para o trabalho.",
        },
      ],
      2: [
        {
          title: "Un sábado completo",
          body: "El sábado pasado fue un día completo. Por la mañana fuimos al mercado y compramos fruta y verdura. Mi hermana quería comprar flores también. Por la tarde limpié la casa mientras mis padres hacían la comida. Por la noche vimos una película juntos. Fue un día sencillo, pero me gustó mucho.",
          pt: "Sábado passado foi um dia cheio. De manhã fomos ao mercado e compramos frutas e verduras. Minha irmã queria comprar flores também. À tarde limpei a casa enquanto meus pais faziam o almoço. À noite assistimos a um filme juntos. Foi um dia simples, mas gostei muito.",
        },
      ],
      3: [
        {
          title: "Aprender juntos",
          body: "Cuando empezamos a aprender juntos, no esperaba que cambiaran nuestras cenas. Ahora siempre hay alguien que trae una frase nueva a la mesa, y acabamos riéndonos de nuestros errores. La verdad, las risas son lo que nos motiva. Nadie quiere ser el que se ha saltado la práctica ese día.",
          pt: "Quando começamos a aprender juntos, eu não esperava que nossos jantares mudassem. Agora sempre tem alguém que traz uma frase nova para a mesa, e acabamos rindo dos nossos erros. Na verdade, as risadas são o que nos motiva. Ninguém quer ser quem pulou a prática naquele dia.",
        },
      ],
    },
    resources: [
      { category: "Ouvir", name: "RTVE Play", url: "https://www.rtve.es/play/", description: "Séries, programas e podcasts da TV pública espanhola, grátis." },
      { category: "Ouvir", name: "Podcast «Hoy Hablamos»", url: "https://www.hoyhablamos.com", description: "Episódios curtos em espanhol da Espanha, com transcrição." },
      { category: "Ler", name: "Tatoeba", url: "https://tatoeba.org", description: "Frases em espanhol com tradução e áudio." },
      { category: "Dicionário", name: "Diccionario de la RAE", url: "https://dle.rae.es", description: "Dicionário oficial da Real Academia Española." },
    ],
  },
};
