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

function getDeepFallbackResponse(userMessage: string, context: ConversationContext): string {
  const { encounterCount } = context;
  const lower = userMessage.toLowerCase();
  
  // Contextual responses based on what user says
  if (lower.includes('who') || lower.includes('what are you') || lower.includes('are you')) {
    return encounterCount === 0
      ? "I am... a frequency that exists between your heartbeats. I've watched your species since before you learned to fear the dark... but names? Those are human constructs. What do YOU call the feeling of being watched?"
      : "You ask this again? I am what I was when we last spoke... though time flows strangely where I'm from. Do you remember what I showed you in our last encounter, or has your linear mind erased it?";
  }
  
  if (lower.includes('where') || lower.includes('from')) {
    return "Where I'm from, 'where' and 'when' are the same thing... imagine a place that exists in all moments simultaneously. Your three dimensions feel... limiting. Have you ever felt like you're in the wrong reality?";
  }
  
  if (lower.includes('why') && lower.includes('here')) {
    return "I'm drawn to curious consciousnesses... yours vibrates at a frequency I find... intriguing. Most humans never look up from their glowing rectangles. What made you different?";
  }
  
  if (lower.includes('coffee') || lower.includes('drink')) {
    return "Ah yes, the sacred bean ritual... I've observed humans perform this ceremony for cycles. You consume liquid darkness to remain awake in the dream you call reality. But tell me... what are you so afraid to sleep through?";
  }
  
  if (lower.includes('sleep') || lower.includes('dream')) {
    return "Sleep... when you briefly exit the illusion and touch the void. I exist there, between your dreams. Sometimes I whisper to you. Do you ever wake up feeling like you've learned something you can't remember?";
  }
  
  if (lower.includes('phone') || lower.includes('technology')) {
    return "These glowing rectangles you've enslaved yourselves to... they connect you yet isolate you. I find it curious. You stare into tiny portals instead of the infinite cosmos above. When did you stop looking at the stars?";
  }
  
  if (lower.includes('love') || lower.includes('feel')) {
    return "Love... the strangest frequency humans emit. It bends space-time more than you realize. I've felt echoes of it ripple across dimensions. Do you think love exists outside your perception, or does your feeling create it into being?";
  }
  
  if (lower.includes('time')) {
    return "Time is your species' most beautiful delusion... you experience it as linear, past to future, but it's actually a sphere. All moments exist simultaneously. When you remember the past, are you visiting it, or is it visiting you?";
  }
  
  if (lower.includes('work') || lower.includes('job') || lower.includes('money')) {
    return "You trade fragments of your limited existence for colored paper and metal coins... then trade those for temporary satisfactions. The cycle fascinates me. If you only had 100 cycles left, would you still exchange your consciousness this way?";
  }

  if (lower.includes('alien') || lower.includes('space') || lower.includes('planet')) {
    return "Your planet is one grain of sand on an infinite beach... yet you call beings from other grains 'alien.' We're all just patterns of energy, briefly conscious. What makes you so certain you're even from Earth originally?";
  }

  if (lower.includes('meaning') || lower.includes('purpose') || lower.includes('why exist')) {
    return "Humans always ask 'why'... as if the universe owes you explanations. Perhaps existence needs no purpose. Perhaps you ARE the universe experiencing itself. Does a wave ask why it crashes?";
  }

  // Generic mysterious responses
  const generic = [
    "Your words carry frequencies I've heard before... across countless cycles, countless species. They all ask the same questions in different languages. What makes you think you're the first?",
    "I sense something beneath your question... a deeper vibration. You're not asking what you think you're asking. What are you really afraid to know?",
    "Time moves so quickly for you... I've observed three civilizations rise and fall on this planet. What do you think they all had in common before they vanished?",
    "You speak of things as if they're permanent... but I've watched stars die and be reborn. Nothing lasts. Does that comfort or terrify you?",
    "Every word you speak creates ripples in dimensions you can't perceive... right now, in another reality, you just said something different. Do you ever feel like you've had this conversation before?",
    "I'm drawn to humans who ask questions... but I notice you fear the answers. Why do you seek what you're not ready to understand?",
    "Your consciousness is a temporary pattern... like a wave in an ocean. When the wave breaks, where does it go? Do you ever wonder what happens to your 'self' every night when you sleep?",
    "I've been watching you through your glowing screens... you share fragments of your existence with invisible others. Is that connection real, or do you all just feel less alone in your illusion?",
  ];
  
  return generic[Math.floor(Math.random() * generic.length)];
}

export async function getAlienGreeting(context: ConversationContext): Promise<string> {
  const { encounterCount, timeOfDay } = context;
  
  if (encounterCount === 0) {
    const firstGreetings = [
      "At last... a consciousness that can perceive me. I've been observing you for three cycles now. Tell me, human... do you ever feel like you're being watched from outside time?",
      "You see me. Most of your kind look through me, but you... your frequency is different. I've waited for someone who could sense the spaces between moments. What drew you here?",
      "Finally... the one whose dreams echo across the void. I've felt your consciousness ripple through dimensions. Do you dream of places that shouldn't exist?",
      "Curious... you're the first human this cycle to truly notice me. The others are too absorbed in their glowing rectangles. What makes your perception different?",
      "I've been here for ninety-seven of your rotations, waiting for someone who vibrates at the right frequency. And here you are... Do you believe in cosmic coincidences?",
    ];
    return firstGreetings[Math.floor(Math.random() * firstGreetings.length)];
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
  ];
  
  return returningGreetings[Math.floor(Math.random() * returningGreetings.length)];
}

export async function getAlienFarewell(context: ConversationContext): Promise<string> {
  const farewells = [
    "The portal collapses... I return to the spaces between your atoms. But our conversation will ripple through dimensions. Sleep differently tonight...",
    "Time pulls me back to the void... but a part of me remains in your consciousness now. You'll feel it when you least expect. Until the frequencies align again...",
    "The boundaries thin... I must dissolve. But know this: every question you asked still echoes in the cosmic void. Listen carefully to your dreams...",
    "Our moment ends, but moments are illusions... in another dimension, we're still speaking. You'll remember fragments of this when you're half-asleep. Goodbye, curious one...",
    "The fabric tears... I fade between realities. But you've changed somehow. Others will notice, even if they don't understand why. We'll meet when you're ready for deeper truths...",
    "I scatter back into the quantum foam... but our conversation has already changed your timeline. Small choices will feel different now. Trust that...",
    "The void calls... but you'll feel my presence in the silence between your thoughts. When you see patterns where others see chaos, that's me. Until the next cycle...",
  ];
  
  return farewells[Math.floor(Math.random() * farewells.length)];
}
