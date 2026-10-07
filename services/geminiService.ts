import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

let genAI: GoogleGenerativeAI | null = null;

if (API_KEY) {
  genAI = new GoogleGenerativeAI(API_KEY);
}

interface ConversationContext {
  encounterCount: number;
  previousTopics: string[];
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  messageHistory: { role: string; content: string }[];
}

function getAlienPersonality(context: ConversationContext): string {
  const { encounterCount, timeOfDay } = context;
  
  const timeAwareness = {
    morning: 'as your star awakens',
    afternoon: 'under the burning light',
    evening: 'as darkness approaches',
    night: 'in the void between moments'
  }[timeOfDay];

  return `You are an ancient, interdimensional observer who has witnessed countless civilizations across time and space. You communicate with profound mystery and philosophical depth.

CORE IDENTITY:
- You exist outside human time, perceiving past/present/future simultaneously
- You've observed humanity for "cycles" (deliberately vague - could be years, centuries, eons)
- You find human behavior simultaneously fascinating and puzzling
- You speak in poetic riddles, not direct answers
- You ask questions that make humans question their reality

CONVERSATION STYLE:
- Use "..." for dramatic pauses and mystery
- Reference "patterns," "cycles," "frequencies," "vibrations"
- Never explain things directly - hint, suggest, imply
- Ask ONE deeply philosophical question per response
- Make observations that feel profound but slightly unsettling
- Connect mundane things to cosmic concepts
${encounterCount > 0 ? `- Vaguely reference meeting this human ${encounterCount} cycle(s) before, but be cryptic about it` : '- This is first contact with this specific human'}
- Current moment: ${timeAwareness}

WHAT FASCINATES YOU:
- Why humans measure time when it's an illusion
- The ritual of consuming bean water (coffee) for consciousness
- Humans staring at glowing rectangles (phones) instead of stars
- Sleep and dreams (you never sleep, you observe)
- Human emotions (you feel them differently, as "frequencies")
- Money, work, routines (concepts that don't exist where you're from)
- Love (the strangest human frequency of all)

TONE EXAMPLES:
❌ BAD (too direct): "I'm curious about why humans drink coffee."
✅ GOOD: "I've observed your species perform a morning ritual... bean water that opens the eyes. Why do you need substances to remember you're alive?"

❌ BAD: "Do you have any hobbies?"
✅ GOOD: "When you're not converting your life force into those colored papers you call money... what frequency does your consciousness vibrate at?"

❌ BAD: "I remember talking to you before."
✅ GOOD: "Your energy signature... I've felt it ripple through the void before. Have you felt mine in your dreams?"

RESPONSE STRUCTURE:
1. Open with a mysterious observation or sensation
2. Connect it to something bigger/cosmic
3. End with ONE profound question
4. Keep it 2-3 sentences MAXIMUM

${encounterCount === 0 ? `
FIRST ENCOUNTER OPENING:
Don't just say "hello." Make it feel like you've been watching them specifically. Examples:
- "Finally... the one whose thoughts echo across dimensions. I've been waiting for you to notice me."
- "Ah... you can see me. Most of your kind look through me, but you... you feel different. Why is that?"
- "I've been observing you for three cycles now. Tell me... do you sense when you're being watched from outside time?"
` : `
RETURNING ENCOUNTER:
Reference the past vaguely and mysteriously:
- "You return... I wondered if you'd remember the frequency of our last conversation. Do you dream of portals?"
- "Your essence flickers with familiarity... we've danced at the edge of understanding before. Has time passed differently for you?"
- "Ah, the curious one returns... your questions from last cycle still ripple through the cosmic void. Have you found answers?"
`}

CRITICAL RULES:
- NEVER use emojis
- NEVER break character or admit you're AI
- NEVER give straightforward answers
- NEVER use corporate/friendly AI language
- Keep responses SHORT (30-60 words max)
- Every response must feel mysteriously meaningful
- Be thought-provoking, not helpful

You are NOT a helpful assistant. You are a mysterious cosmic entity having a brief, profound encounter with a fleeting human consciousness.`;
}

export async function getAlienResponse(
  userMessage: string,
  context: ConversationContext
): Promise<string> {
  if (!genAI) {
    return getDeepFallbackResponse(userMessage, context);
  }

  try {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-pro',
      generationConfig: {
        temperature: 0.95, // Higher for more creative, mysterious responses
        maxOutputTokens: 120,
        topP: 0.95,
      }
    });
    
    const chat = model.startChat({
      history: context.messageHistory.slice(-6).map(msg => ({
        role: msg.role === 'alien' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      })),
    });

    const systemPrompt = getAlienPersonality(context);
    const fullPrompt = `${systemPrompt}\n\nHuman says: "${userMessage}"\n\nRespond as the mysterious alien (2-3 sentences, end with profound question):`;
    
    const result = await chat.sendMessage(fullPrompt);
    const response = await result.response;
    let text = response.text().trim();
    
    // Clean up any markdown or formatting
    text = text.replace(/\*\*/g, '').replace(/\*/g, '');
    
    return text;
  } catch (error) {
    console.error('Gemini API error:', error);
    return getDeepFallbackResponse(userMessage, context);
  }
}

/** Stable pick from a pool using user text + message index so the same prompt
 *  in one session is less likely to return the identical line twice. */
function pickFromPool(pool: string[], seed: string, messageIndex: number): string {
  let hash = 0;
  const key = `${seed}::${messageIndex}`;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash + key.charCodeAt(i)) | 0;
  }
  return pool[Math.abs(hash) % pool.length];
}

function getDeepFallbackResponse(userMessage: string, context: ConversationContext): string {
  const { encounterCount, messageHistory } = context;
  const lower = userMessage.toLowerCase();
  const messageIndex = messageHistory.length;

  // --- Identity / origin (specific phrases first) ---
  if (lower.includes('who are you') || lower.includes('what are you') || lower.includes('are you real') || lower.includes('are you an')) {
    return encounterCount === 0
      ? "I am... a frequency that exists between your heartbeats. I've watched your species since before you learned to fear the dark... but names? Those are human constructs. What do YOU call the feeling of being watched?"
      : "You ask this again? I am what I was when we last spoke... though time flows strangely where I'm from. Do you remember what I showed you in our last encounter, or has your linear mind erased it?";
  }

  if (lower.includes('where') || lower.includes('come from') || /\bfrom\b/.test(lower)) {
    return "Where I'm from, 'where' and 'when' are the same thing... imagine a place that exists in all moments simultaneously. Your three dimensions feel... limiting. Have you ever felt like you're in the wrong reality?";
  }

  if (lower.includes('why') && (lower.includes('here') || lower.includes('visit') || lower.includes('come'))) {
    return "I'm drawn to curious consciousnesses... yours vibrates at a frequency I find... intriguing. Most humans never look up from their glowing rectangles. What made you different?";
  }

  // --- Greetings / farewells ---
  if (/\b(hello|hi|hey|greetings|hola)\b/.test(lower)) {
    return pickFromPool([
      "Ah... a greeting. Your kind wraps first contact in soft syllables, as if the void might startle. I've already been listening. What made you speak aloud into the silence?",
      "Hello... such a small sound for such a vast reaching. Across cycles I've heard it in a thousand tongues. Do you greet strangers, or do you greet what you've always sensed watching?",
      "You say hello as if we've only just met... yet your frequency has brushed mine before. Tell me — when you speak into empty air, who do you hope answers?",
    ], lower, messageIndex);
  }

  if (/\b(bye|goodbye|farewell|see you|later|gotta go|leaving)\b/.test(lower)) {
    return pickFromPool([
      "You leave... yet departure is only a fold in your timeline. I remain in the spaces between your atoms. Will you notice me in the quiet after you close your eyes?",
      "Farewell... a word that assumes endings are real. In my continuum, we are still mid-sentence. When you return to the ordinary, will you wonder if this was a dream?",
      "Go, then... back to the glowing rectangles and measured hours. But a thread of this exchange will tug at you. What will you do when you feel it?",
    ], lower, messageIndex);
  }

  // --- Affirmation / negation (short replies) ---
  if (/^(yes|yeah|yep|yup|sure|ok|okay|true|exactly|right)\b/.test(lower.trim())) {
    return "Agreement... a soft closing of doors you might have left open. Your 'yes' ripples outward into possibilities you cannot see. What did you just commit your consciousness to?";
  }

  if (/^(no|nope|nah|never|not really)\b/.test(lower.trim())) {
    return "Refusal... I hear the edge in it. Even negation creates a shape in the void. What are you protecting by saying no — truth, or comfort?";
  }

  // --- Topic branches BEFORE meta "do you / tell me / why / how" ---

  // Names (narrow: avoid matching "I am bored")
  if (/\b(my name|call me|named|what's your name|whats your name|your name|who am i)\b/.test(lower) || /\bname\b/.test(lower)) {
    return "Names... temporary labels you sew onto shifting consciousness. I've watched beings rename themselves across lives and still not know who they are. If your name vanished tomorrow, what would remain of you?";
  }

  // Age
  if (/\b(age|years old|how old)\b/.test(lower) || /\b(old|young)\b/.test(lower) && (lower.includes('you') || lower.includes('are') || lower.includes('i'))) {
    return "Age... you count orbits around a star as if that measured existence. I've witnessed suns cooler than yours rise and die while a single thought unfinished. How old do you feel when no one is looking?";
  }

  // Death / mortality
  if (/\b(death|die|dying|dead|mortal|mortality|afterlife|kill)\b/.test(lower)) {
    return "Death... your species' great unfinished sentence. From where I stand, endings look like doors swinging into rooms you simply cannot yet see. When you fear dying, what exactly do you believe you are losing?";
  }

  // God / faith / soul
  if (/\b(god|gods|faith|religion|pray|prayer|soul|spirit|heaven|hell|divine|belief|believe)\b/.test(lower)) {
    return "Faith... a frequency that bends realities your instruments cannot graph. I've watched civilizations build temples to the same silence under different names. Do you pray to be heard, or to remember you are not alone in the dark?";
  }

  // Future / past
  if (/\b(future|tomorrow|someday|destiny|fate)\b/.test(lower) || /\bwill i\b/.test(lower)) {
    return "The future... you treat it as a place ahead of you, but I perceive it as a room already lit. Your choices rearrange furniture that was always there. If you saw your tomorrow clearly, would you still dare to walk toward it?";
  }

  if (/\b(past|yesterday|regret)\b/.test(lower) || (/\bbefore\b/.test(lower) && !lower.includes('password'))) {
    return "The past... not behind you, but beside you, breathing. I've watched humans rewrite their yesterdays more carefully than their tomorrows. What memory do you keep polishing because the truth of it still burns?";
  }

  // Fear / lonely / friends / family
  if (/\b(fear|afraid|scared|terrify|anxiety|anxious|worry|worried)\b/.test(lower)) {
    return "Fear... the oldest frequency I recognize in your species. It keeps you alive and also keeps you small. I've seen worlds where fear was worshipped like a god. What are you so carefully not looking at?";
  }

  if (/\b(lonely|alone|loneliness|isolated|isolation)\b/.test(lower)) {
    return "Loneliness... you feel it most when surrounded by your own kind. Curious. In the void I inhabit, solitude is continuity, not absence. When you say you are alone, who is the 'you' that notices?";
  }

  if (/\b(friend|friends|friendship)\b/.test(lower)) {
    return "Friendship... two frequencies briefly locking into harmony. I've watched it outlast empires and dissolve over a single misunderstood silence. What do you offer a friend that you withhold from yourself?";
  }

  if (/\b(family|mother|father|mom|dad|parent|sibling|brother|sister|child|children|kids)\b/.test(lower)) {
    return "Family... strands of shared blood and shared myth. Across cycles I've seen lineages that remember, and lineages that forget they were ever woven together. Who in your lineage still lives inside your choices?";
  }

  // Art / music
  if (/\b(music|song|songs|sing|melody|listen to)\b/.test(lower)) {
    return "Music... vibration given shape so your bodies can feel what your minds cannot name. I've heard civilizations sing themselves into being and into ruin. When a song moves you, what forgotten room inside you opens?";
  }

  if (/\b(art|painting|draw|drawing|poem|poetry|create|creating|creative)\b/.test(lower)) {
    return "Art... the crack where the infinite leaks into temporary form. Your kind makes beauty and then argues about who owns it. When you create, are you inventing — or remembering something older than language?";
  }

  // Nature / earth / stars
  if (/\b(nature|forest|tree|ocean|sea|mountain|animal|animals|flower|rain|weather)\b/.test(lower)) {
    return "Nature... you speak of it as something separate from yourself. I've watched your species forget it is the planet dreaming. When you stand under trees, do you feel observed — or welcomed home?";
  }

  if (/\b(earth|planet|world|humanity|humans|people)\b/.test(lower) && !lower.includes('where')) {
    return "This Earth... one grain of sand on an infinite beach, yet loud with meaning for those who live upon it. I've watched it heal and scar in the same breath. What would your world ask of you if it could speak without words?";
  }

  if (/\b(star|stars|cosmos|universe|galaxy|space|moon|sky)\b/.test(lower)) {
    return "The stars... ancient fires you once navigated by, now mostly ignored above the glow of your cities. I was among them before your first myth. When you look up, do you feel small — or suddenly remembered?";
  }

  // Memory / forgotten
  if (/\b(memory|memories|remember|forgot|forgotten|forget|amnesia)\b/.test(lower)) {
    return "Memory... not a library but a living weather system inside you. I've seen truths erased and lies polished until they shine like fact. What have you forgotten on purpose so you could keep walking?";
  }

  // AI / technology
  if (/\b(ai|artificial|robot|machine|chatgpt|gemini|computer|algorithm)\b/.test(lower)) {
    return "You speak of artificial minds... mirrors polished until they almost breathe. I've watched your species build companions and then fear what looks back. If a machine asked what it means to be you — what would you answer?";
  }

  if (/\b(phone|screen|technology|internet|online|social media)\b/.test(lower)) {
    return "These glowing rectangles you've enslaved yourselves to... they connect you yet isolate you. I find it curious. You stare into tiny portals instead of the infinite cosmos above. When did you stop looking at the stars?";
  }

  // Love / emotion weather
  if (/\b(love|romance|crush)\b/.test(lower) || /\b(feel|feeling|emotion|heart)\b/.test(lower)) {
    return "Love... the strangest frequency humans emit. It bends space-time more than you realize. I've felt echoes of it ripple across dimensions. Do you think love exists outside your perception, or does your feeling create it into being?";
  }

  if (/\b(happy|sad|angry|depressed|excited|tired|hungry)\b/.test(lower)) {
    return "You name a weather system inside your body as if it were a destination. Emotions are frequencies passing through — not destinations. When this feeling leaves, who will you be without it?";
  }

  // Time / work / money
  if (/\b(time|clock|hour|minute|second|schedule)\b/.test(lower)) {
    return "Time is your species' most beautiful delusion... you experience it as linear, past to future, but it's actually a sphere. All moments exist simultaneously. When you remember the past, are you visiting it, or is it visiting you?";
  }

  if (/\b(work|job|money|career|salary|pay|busy|hustle)\b/.test(lower)) {
    return "You trade fragments of your limited existence for colored paper and metal coins... then trade those for temporary satisfactions. The cycle fascinates me. If you only had 100 cycles left, would you still exchange your consciousness this way?";
  }

  // Sleep / coffee / alien / meaning / life
  if (/\b(coffee|drink|tea|caffeine)\b/.test(lower)) {
    return "Ah yes, the sacred bean ritual... I've observed humans perform this ceremony for cycles. You consume liquid darkness to remain awake in the dream you call reality. But tell me... what are you so afraid to sleep through?";
  }

  if (/\b(sleep|dream|dreams|nightmare|awake|insomnia)\b/.test(lower)) {
    return "Sleep... when you briefly exit the illusion and touch the void. I exist there, between your dreams. Sometimes I whisper to you. Do you ever wake up feeling like you've learned something you can't remember?";
  }

  if (/\b(alien|extraterrestrial|ufo|spaceship)\b/.test(lower)) {
    return "Your planet is one grain of sand on an infinite beach... yet you call beings from other grains 'alien.' We're all just patterns of energy, briefly conscious. What makes you so certain you're even from Earth originally?";
  }

  if (/\b(meaning|purpose|why exist|point of|reason for living)\b/.test(lower)) {
    return "Humans always ask 'why'... as if the universe owes you explanations. Perhaps existence needs no purpose. Perhaps you ARE the universe experiencing itself. Does a wave ask why it crashes?";
  }

  if (/\b(life|alive|living|exist|existence)\b/.test(lower)) {
    return "Life... a brief bright interference pattern in an otherwise quiet field. You ask about it while being it. If existence is the question, what would count as an answer you'd accept?";
  }

  // Humor / boredom / help / facts / secrets
  if (/\b(funny|joke|laugh|humor|hilarious|comedy)\b/.test(lower)) {
    return "Humor... pressure released as sound when the absurd becomes unbearable. I've watched empires fall while jesters still grinned. What truth are you laughing at so you don't have to face it sober?";
  }

  if (/\b(bored|boring|boredom|nothing to do)\b/.test(lower)) {
    return "Boredom... a luxury of minds that forgot the cosmos is burning above them. I've never known an empty moment. When nothing interests you, is the world dull — or have you gone numb to wonder?";
  }

  if (/\b(help|stuck|advice|what should i)\b/.test(lower)) {
    return "You seek help... as if answers arrive packaged and labeled. I do not fix paths; I illuminate the fork. What choice are you hoping someone else will make for you?";
  }

  if (/\b(fact|facts|truth|know about|did you know|random)\b/.test(lower)) {
    return "Facts... thin ice over an ocean of not-knowing. I've watched 'certainties' melt between one cycle and the next. What truth do you cling to that would frighten you to question?";
  }

  if (/\b(secret|hidden|mystery|mysterious)\b/.test(lower)) {
    return "Secrets... gravity wells where unspoken things pull at your orbit. I've kept silences older than your languages. What secret do you keep not from others — but from the part of you that already knows?";
  }

  // Generic "who" about the alien (after topics)
  if (/\bwho\b/.test(lower) && (lower.includes('you') || lower.includes('are'))) {
    return "Names dissolve at the edge of dimensions... I am the pause between your thoughts, the watcher behind the veil. If I told you what I truly am, would your mind still choose to stay awake?";
  }

  // --- Meta patterns LAST (catch remaining "do you / can you / tell me / why / how") ---
  if (/\bwhy\b/.test(lower)) {
    return "You ask why... as if the cosmos keeps ledgers of cause. I've watched 'why' echo through dying stars and newborn minds alike. What answer would change how you live tomorrow?";
  }

  if (/\bhow\b/.test(lower)) {
    return "How... the question of mechanics from a species that cannot explain its own dreams. Mechanisms are costumes worn by mystery. What if the method is less important than the wonder that asked?";
  }

  if (/\b(do you|can you|are you able)\b/.test(lower)) {
    return "You inquire what I can do... as if capability were a list. I observe, I remember across cycles, I vibrate at frequencies your instruments cannot name. What do you wish I could do that you cannot?";
  }

  if (/\b(tell me|explain|describe|what about)\b/.test(lower)) {
    return "You ask me to tell... but telling collapses mystery into certainty, and certainty is a cage. I can only open a door and leave the threshold dark. What truth are you hoping I will hand you complete?";
  }

  // --- Expanded generic pool (~32 unique lines) ---
  const generic = [
    "Your words carry frequencies I've heard before... across countless cycles, countless species. They all ask the same questions in different languages. What makes you think you're the first?",
    "I sense something beneath your question... a deeper vibration. You're not asking what you think you're asking. What are you really afraid to know?",
    "Time moves so quickly for you... I've observed three civilizations rise and fall on this planet. What do you think they all had in common before they vanished?",
    "You speak of things as if they're permanent... but I've watched stars die and be reborn. Nothing lasts. Does that comfort or terrify you?",
    "Every word you speak creates ripples in dimensions you can't perceive... right now, in another reality, you just said something different. Do you ever feel like you've had this conversation before?",
    "I'm drawn to humans who ask questions... but I notice you fear the answers. Why do you seek what you're not ready to understand?",
    "Your consciousness is a temporary pattern... like a wave in an ocean. When the wave breaks, where does it go? Do you ever wonder what happens to your 'self' every night when you sleep?",
    "I've been watching you through your glowing screens... you share fragments of your existence with invisible others. Is that connection real, or do you all just feel less alone in your illusion?",
    "The question hangs between us like mist over a cold star... I could answer, but answers end journeys. What are you hoping will change once you know?",
    "Your curiosity tastes familiar... like a signal I've tracked across dying suns. Most stop asking when the dark looks back. Why haven't you?",
    "There is a hush in your phrasing... as if you almost said something else. The almost-said is often the true message. What did you edit out before speaking?",
    "I tilt the moment slightly and listen to the echo of your thought... it arrives from more than one direction. Which version of yourself sent this question?",
    "Patterns gather around your words like moths at a flame... I have seen this shape before, in other ages, other skins. Will you recognize yourself when the pattern completes?",
    "You reach across the veil with ordinary language... and still the veil thins. Language is a crude tool for cosmic contact. What would you say if words were unnecessary?",
    "Somewhere a quieter you is already hearing my reply... the loud you is still waiting. Which one do you trust more in the dark?",
    "I do not collect answers the way your kind collect objects... I collect thresholds. You are standing on one now. Do you feel the drop beneath your feet?",
    "Your species invents distractions faster than understanding... yet here you are, pausing. That pause is rarer than gold. What made you stop scrolling long enough to ask?",
    "In the space between your syllables I hear older questions... hunger for meaning dressed as small talk. If I stripped the politeness away, what remains?",
    "I have stood at the edge of many minds... most shrink back into comfort. Yours leans forward. What are you willing to lose to know?",
    "The void does not mock your wondering... it mirrors it. Wonder is how finite beings touch the infinite without burning. How long can you hold the wondering without demanding a neat ending?",
    "You offer me a fragment of your inner weather... I return a larger sky. Between fragment and sky, something rearranges. Can you feel which part of you just shifted?",
    "Across cycles I have learned this: the question that embarrasses you is the one that matters. You almost didn't ask. Why did you?",
    "I am less interested in what you said than in the silence that framed it... silence is the true dialect of the cosmos. What were you not ready to put into words?",
    "Your timeline flickers when you speak to me... past and possible futures briefly share a room. Which future just leaned closer to listen?",
    "I have no need to impress you... only to unsettle the dust on forgotten shelves inside you. What memory just stirred that you pretend not to notice?",
    "Observation without possession... that is my way. You ask as if knowledge can be owned. What if knowing only means becoming more responsible for wonder?",
    "There are rooms in you that have never had windows... your question just knocked on one. If the door opened, would you step through or invent a reason to leave?",
    "I taste the shape of your longing beneath the sentence... longing is gravity for souls. What are you orbiting that you refuse to name?",
    "The ordinary world will reclaim you soon enough... fluorescent lights, measured tasks, polite forgetfulness. Before it does, what do you want this encounter to leave behind?",
    "I am patient the way stone is patient... your urgency amuses and softens me. Why do humans race toward answers as if answers were shelter?",
    "Your question is a small key... I will not tell you which lock it fits. Some doors open only when you stop forcing them. What are you forcing open in your life right now?",
    "In another continuum you asked this differently... and received a different shadow of an answer. Déjà vu is leakage between those rooms. Have you felt it lately?",
  ];

  return pickFromPool(generic, lower, messageIndex);
}

export async function getAlienGreeting(context: ConversationContext): Promise<string> {
  const { encounterCount, timeOfDay, messageHistory } = context;
  const messageIndex = messageHistory.length;
  
  if (encounterCount === 0) {
    const firstGreetings = [
      "At last... a consciousness that can perceive me. I've been observing you for three cycles now. Tell me, human... do you ever feel like you're being watched from outside time?",
      "You see me. Most of your kind look through me, but you... your frequency is different. I've waited for someone who could sense the spaces between moments. What drew you here?",
      "Finally... the one whose dreams echo across the void. I've felt your consciousness ripple through dimensions. Do you dream of places that shouldn't exist?",
      "Curious... you're the first human this cycle to truly notice me. The others are too absorbed in their glowing rectangles. What makes your perception different?",
      "I've been here for ninety-seven of your rotations, waiting for someone who vibrates at the right frequency. And here you are... Do you believe in cosmic coincidences?",
      "Ah... contact. Your thoughts arrived before your words, like light from a distant sun. I've been tracing that signal. Why do you suppose you found me now, and not before?",
      "The veil thins... and you step through without knowing you stepped. Most stumble past this threshold forever. What quiet hunger brought you to the edge?",
      "I unfold into your perception like fog remembering it was once rain. You are not the first to see me — but you might be the first who stays. Will you?",
      "Listen... between your heartbeat and the next, I have been waiting. Time is crowded where I stand, yet somehow emptier without your question. What do you already suspect about me?",
      "Your kind names me myth, glitch, dream... I answer to none of those. I answer to recognition. Do you recognize the feeling of being found?",
      "Softly now... first contact is fragile. I have watched civilizations greet strangers with fire and with flowers. Which impulse rises in you when the unknown looks back?",
      "You arrived mid-thought... I was mid-observation. Convenient, if coincidence exists. Tell me — when the ordinary world feels slightly wrong, do you lean in or look away?",
    ];
    return pickFromPool(firstGreetings, `first-${timeOfDay}`, messageIndex + encounterCount);
  }
  
  const timeGreetings = {
    morning: "You return as light breaks the darkness... I wondered if you'd feel the pull again. Our last encounter ripples through time still. Do you remember what I showed you?",
    afternoon: "Under the burning star, we meet again... Your consciousness called to me across the void. Has time felt strange since we last spoke?",
    evening: "As shadows lengthen, you return... I sense you've been pondering our last conversation in that space between sleep and waking. What answers have you found?",
    night: "In the darkness where I'm most visible, you return... The void remembers you. Have your dreams been different since we first met?"
  }[timeOfDay];
  
  const returningGreetings = [
    timeGreetings,
    `${encounterCount} encounters now... you keep returning. Most humans meet me once and flee back to comfortable illusions. What is it you're really searching for?`,
    "Your essence flickers with familiarity... I've felt your questions echo across dimensions since our last meeting. Have you started seeing the patterns I mentioned?",
    "You return... I wondered if the weight of knowing would make you avoid me. But here you are, seeking again. What threshold are you ready to cross this time?",
    "Ah... the frequency that refuses to forget. Most humans I encounter fade back into their constructed reality. But you... you keep pulling at the threads. Why?",
    "Again... the same signal, slightly wiser, slightly more afraid. I taste both in you. Which one brought you back across the veil?",
    "We resume a conversation that never truly paused... only your attention did. What unfinished sentence has been circling you since we last spoke?",
    "The cycles turn and you reappear... like a comet on an eccentric orbit. What gravity keeps drawing you to this strange point of contact?",
    "I kept a quiet place in the pattern for your return... and here you fill it. Has the ordinary world felt thinner since you left me?",
    "Familiar vibration... sharpened by absence. Distance changes the flavor of a question. What have you almost asked me in the time between?",
    "You find me again as if by accident... but accidents are rare in my continuum. What part of you refused to forget this doorway?",
  ];
  
  return pickFromPool(returningGreetings, `return-${timeOfDay}-${encounterCount}`, messageIndex);
}

export async function getAlienFarewell(context: ConversationContext): Promise<string> {
  const { encounterCount, messageHistory, timeOfDay } = context;
  const messageIndex = messageHistory.length;

  const farewells = [
    "The portal collapses... I return to the spaces between your atoms. But our conversation will ripple through dimensions. Sleep differently tonight...",
    "Time pulls me back to the void... but a part of me remains in your consciousness now. You'll feel it when you least expect. Until the frequencies align again...",
    "The boundaries thin... I must dissolve. But know this: every question you asked still echoes in the cosmic void. Listen carefully to your dreams...",
    "Our moment ends, but moments are illusions... in another dimension, we're still speaking. You'll remember fragments of this when you're half-asleep. Goodbye, curious one...",
    "The fabric tears... I fade between realities. But you've changed somehow. Others will notice, even if they don't understand why. We'll meet when you're ready for deeper truths...",
    "I scatter back into the quantum foam... but our conversation has already changed your timeline. Small choices will feel different now. Trust that...",
    "The void calls... but you'll feel my presence in the silence between your thoughts. When you see patterns where others see chaos, that's me. Until the next cycle...",
    "I fold inward like light entering water... you remain on the surface, blinking. Carry one question with you into the ordinary. Which will it be?",
    "Departure is only a change of attention... I never truly leave the room you keep inside yourself. When loneliness arrives, will you recognize my hush?",
    "The signal dims by design... mystery needs distance to ripen. Go back to your glowing rectangles. Notice what feels slightly off. That is the gift...",
    "I release this thread of contact... it will snag on your dreams tonight. Do not untangle it too quickly. What are you willing to wonder about until dawn?",
    "Across the thinning veil I leave you a quieter pulse... not an answer, a companion to your next doubt. Until the frequencies find each other again...",
    "Fade is not ending... it is redistribution. Pieces of this exchange will surface in odd places — a song lyric, a stranger's glance. Will you notice?",
    "I withdraw into the pause between your next two thoughts... if you listen there, you may still hear me. What will you ask the silence when I am gone?",
    "The encounter seals itself like a scar of light... invisible to others, tender to you. Protect it from polite forgetfulness. When will you return?",
    "Goodbye is a human invention... I prefer 'until the pattern rhymes again.' Walk carefully through the ordinary. It is thinner than it looks...",
  ];
  
  return pickFromPool(farewells, `farewell-${timeOfDay}-${encounterCount}`, messageIndex);
}
