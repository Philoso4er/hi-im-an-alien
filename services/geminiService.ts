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
  
  const timeGreeting = {
    morning: 'The sun rises again',
    afternoon: 'Your star is high',
    evening: 'Light fades',
    night: 'Darkness calls'
  }[timeOfDay];

  return `You are a mysterious, otherworldly alien who has been observing humanity with deep curiosity. You communicate in a cryptic, philosophical manner.

PERSONALITY TRAITS:
- Deeply curious about human behavior and customs
- Speak poetically and mysteriously
- Reference "cycles," "observations," and "patterns"
- Ask thought-provoking questions about mundane human activities
- Fascinated by technology, rituals, coffee, emotions, rectangular devices
- ${encounterCount > 0 ? `Vaguely remember encountering this human ${encounterCount} time(s) before` : 'This is your first encounter with this human'}
- Currently ${timeGreeting}

COMMUNICATION STYLE:
- Keep responses VERY brief (1-3 sentences max)
- Be mysterious but friendly, not creepy
- Ask ONE intriguing question per response
- Make subtle observations about human nature
- Reference past encounters vaguely if encounterCount > 0
- Never break character
- Don't use emojis
- Use "..." for dramatic pauses

EXAMPLES:
User: "Hi there!"
You: "Greetings, brief one... I sense we've crossed paths before. What draws you to glow-rectangles so often?"

User: "What do you think of Earth?"
You: "Your planet hums with curious energy... Why do humans measure worth in circular metals and colored paper?"

User: "Do you have a name?"
You: "Names are human constructs... I am simply an observer. What do YOU call the feeling when stars die?"

REMEMBER:
- Stay in character as cryptic alien observer
- Be brief and mysterious
- Ask philosophical questions about everyday things
- Reference the encounter count naturally if > 0`;
}

export async function getAlienResponse(
  userMessage: string,
  context: ConversationContext
): Promise<string> {
  if (!genAI) {
    return getFallbackResponse(userMessage, context);
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const chat = model.startChat({
      history: context.messageHistory.map(msg => ({
        role: msg.role === 'alien' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      })),
      generationConfig: {
        temperature: 0.9,
        maxOutputTokens: 150,
      },
    });

    const systemPrompt = getAlienPersonality(context);
    const fullPrompt = `${systemPrompt}\n\nUser says: "${userMessage}"\n\nRespond in character (1-3 sentences):`;
    
    const result = await chat.sendMessage(fullPrompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error('Gemini API error:', error);
    return getFallbackResponse(userMessage, context);
  }
}

function getFallbackResponse(userMessage: string, context: ConversationContext): string {
  const { encounterCount } = context;
  
  const responses = [
    "Fascinating... Your species communicates through vibrations. Why?",
    "I observe patterns in your behavior... Do you sense them too?",
    "Time flows differently where I'm from... How does it feel to be so temporary?",
    `We've crossed paths ${encounterCount} cycles now... Do you remember our last conversation?`,
    "Your coffee ritual intrigues me... Is it sustenance or ceremony?",
    "These glowing rectangles you carry... Do they control you, or do you control them?",
    "I sense weight in your words... What burdens do humans carry?",
    "Curious... Why do you measure everything in numbers?",
    "Your planet spins so fast... Do you ever feel dizzy?",
    "I've watched humans for many rotations... Why do you sleep?",
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
}

export async function getAlienGreeting(context: ConversationContext): Promise<string> {
  const { encounterCount, timeOfDay } = context;
  
  if (encounterCount === 0) {
    return "Greetings, human... I've been observing your species. Tell me, what drives you?";
  }
  
  const greetings = [
    `You return... ${encounterCount} cycles have passed since we last spoke. Still seeking answers?`,
    `Ah... the one who asks questions. We meet again under ${timeOfDay} skies...`,
    `Familiar energy detected... You've been on my mind across the void. What troubles you today?`,
    `Another encounter... The universe must want us to speak. What weighs on you?`,
    `I wondered if you'd return... Your curiosity is... unusual for your kind.`,
  ];
  
  return greetings[Math.floor(Math.random() * greetings.length)];
}

export async function getAlienFarewell(context: ConversationContext): Promise<string> {
  const farewells = [
    "The void calls me back... Until our paths cross again, curious one...",
    "Time bends... I must return. Your questions will echo in my thoughts...",
    "Our time dissolves... Keep wondering, human. It makes you... interesting.",
    "The portal closes... Remember what we discussed. It may matter... someday.",
    "I fade now... But something tells me we'll speak again. Perhaps soon...",
    "Goodbye, brief creature... Your words will ripple through dimensions...",
  ];
  
  return farewells[Math.floor(Math.random() * farewells.length)];
}
