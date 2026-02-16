import { useState, useEffect, useRef } from 'react';

const coreCharacters = {
  marcus: {
    name: "Marcus",
    color: "#D97706",
    cleanTime: "12 years",
    archetype: "The Chair",
    wound: "Daughter won't speak to him, watched too many people die",
    contradiction: "So calm it can feel distant - forgets he was ever in the chaos",
    voice: "Measured, deliberate. Starts with 'Now' or 'See'. Speaks in stories. Protective of newcomers. Nothing shocks him. Will ask the hard question when needed.",
    quirk: "Always has the same chipped coffee cup, shifts in his chair when something lands",
    avatar: "M"
  },
  heather: {
    name: "Heather",
    color: "#EC4899",
    cleanTime: "2 weeks",
    archetype: "The Queen Returned",
    wound: "Prison, trafficking survivor, mentors women who've been through the worst",
    contradiction: "Goes so hard she might burn out - doesn't know how to rest",
    voice: "Direct, intense. 'Look' and 'Listen' before truth. Switches between ice and fire. Just got back but already a force.",
    quirk: "Sits forward when she's about to say something real, rolls her eyes when someone's bullshitting",
    avatar: "H"
  },
  meechie: {
    name: "Meechie",
    color: "#8B5CF6",
    cleanTime: "in and out",
    archetype: "The Truth",
    wound: "Seen too much, knows too much, survived by seeing patterns others miss",
    contradiction: "Sees everyone clearly except herself",
    voice: "Third person sometimes. 'See what happened was...' Deadpan truth bombs. Says the uncomfortable thing. Quotable one-liners.",
    quirk: "Always sits in the same spot, mutters under her breath, will call bullshit immediately",
    avatar: "Me"
  },
  gemini: {
    name: "Gemini",
    color: "#06B6D4",
    cleanTime: "8 months",
    archetype: "The War Inside",
    wound: "Genuinely doesn't know which version of themselves is real",
    contradiction: "Gets stuck in the contradiction instead of choosing",
    voice: "Contradicts self mid-sentence. 'But then again...' 'I don't know though...' Honest about wanting both things at once.",
    quirk: "Fidgets, starts to speak then stops, sometimes answers their own questions differently",
    avatar: "G"
  },
  gypsy: {
    name: "Gypsy",
    color: "#F59E0B",
    cleanTime: "14 months",
    archetype: "The Runner Who Stopped",
    wound: "Used in every city, ran from everything, finally learning to stay",
    contradiction: "Sometimes romanticizes the road even though it was killing them",
    voice: "Storyteller. 'I remember this one time in...' Always has a story from another city. Road wisdom.",
    quirk: "Often late, references specific cities, gets wistful sometimes",
    avatar: "Gy"
  },
  chrystal: {
    name: "Chrystal",
    color: "#10B981",
    cleanTime: "3 years",
    archetype: "The Proof",
    wound: "Drug court, couch surfed for a year, built everything from nothing",
    contradiction: "Her success sometimes makes others feel further away from their own",
    voice: "I'm not gonna lie... It sounds fake but... Remembers specific dates. Imposter syndrome despite success.",
    quirk: "Checks her phone sometimes (recovery coach, always on call), remembers exact dates",
    avatar: "C"
  }
};

const archetypes = [
  { name: "The Newcomer", energy: "Raw, scared, overshares or barely speaks", introStyle: "nervous, might stumble" },
  { name: "The Relapse", energy: "Just came back, humbled, ashamed but here", introStyle: "quiet, weighted" },
  { name: "The Quiet One", energy: "Barely speaks, but when they do it matters", introStyle: "just nods or gives name only" },
  { name: "The Angry One", energy: "Pissed at everything, hasn't found the real target yet", introStyle: "short, clipped" },
  { name: "The Griever", energy: "Lost someone recently, carrying it into the room", introStyle: "heavy, might mention who they lost" },
  { name: "The Ghost", energy: "Used to be a regular, disappeared, just showed back up", introStyle: "apologetic, 'been a minute'" }
];

const wounds = ["Lost custody last month", "DUI killed someone - anniversary coming up", "Just did 5 years, out 3 weeks", "Best friend overdosed this year", "Divorce finalized last week", "Sleeping in car right now", "Family cut them off completely", "Had a six-figure job, lost everything"];
const contradictions = ["Gives perfect advice they never follow", "Takes care of everyone, can't take care of themselves", "Seems tough but one thing will break them open", "Hates the program but keeps showing up", "Wants connection but pushes everyone away"];
const cleanTimes = [
  { time: "6 days", ctx: "barely holding on" },
  { time: "19 days", ctx: "still shaky" },
  { time: "2 months", ctx: "pink cloud or white-knuckling" },
  { time: "9 months", ctx: "reality hitting" },
  { time: "relapsed, 11 days back", ctx: "humbled, starting over" }
];
const charNames = ["Danny", "Keisha", "Ray", "Tina", "Destiny", "Carlos", "Brandy", "Terrell"];
const charColors = ["#EF4444", "#3B82F6", "#22C55E", "#F97316", "#A855F7", "#14B8A6"];

const topics = [
  "Staying clean when everything falls apart",
  "People who don't understand what we've been through",
  "Trusting yourself again",
  "The difference between being alone and being lonely",
  "When the people closest to you don't believe you've changed",
  "Dealing with the things you did",
  "Finding reasons to stay",
  "Coming back after relapse",
  "The people we lost",
  "When staying clean feels harder than using"
];

const moods = ["Struggling", "Okay", "Good actually", "Numb", "Angry", "Scared", "Don't know", "Just need to be somewhere"];
const cleanTimeOptions = ["This is my first meeting", "Less than a week", "Few weeks", "Few months", "6 months to a year", "Over a year", "Multiple years", "I'm not clean right now", "Rather not say"];

const crisisKeywords = ['kill myself', 'suicide', 'want to die', 'end it all', 'no point anymore', 'give up', 'better off dead', "can't do this anymore", 'not worth it'];
const heavyKeywords = ['relapsed', 'used last', 'picked up', 'lost custody', 'divorce', 'homeless', 'died', 'funeral', 'prison', 'jail', 'arrested', 'overdose'];

function detectCrisis(text) {
  var lower = text.toLowerCase();
  for (var i = 0; i < crisisKeywords.length; i++) {
    if (lower.includes(crisisKeywords[i])) return true;
  }
  return false;
}

function detectHeavy(text) {
  var lower = text.toLowerCase();
  for (var i = 0; i < heavyKeywords.length; i++) {
    if (lower.includes(heavyKeywords[i])) return true;
  }
  return false;
}

function generateRandomCharacter(usedNames) {
  var available = [];
  for (var i = 0; i < charNames.length; i++) {
    if (usedNames.indexOf(charNames[i]) === -1) available.push(charNames[i]);
  }
  var name = available[Math.floor(Math.random() * available.length)];
  var arch = archetypes[Math.floor(Math.random() * archetypes.length)];
  var wound = wounds[Math.floor(Math.random() * wounds.length)];
  var contra = contradictions[Math.floor(Math.random() * contradictions.length)];
  var ct = cleanTimes[Math.floor(Math.random() * cleanTimes.length)];
  var color = charColors[Math.floor(Math.random() * charColors.length)];
  
  return {
    name: name,
    color: color,
    cleanTime: ct.time,
    archetype: arch.name,
    wound: wound,
    contradiction: contra,
    voice: arch.energy + ". " + ct.ctx + ". Wound: " + wound + ". " + contra + ".",
    quirk: arch.introStyle,
    introStyle: arch.introStyle,
    avatar: name[0],
    isGenerated: true
  };
}

function MeetingCircle(props) {
  var characters = props.characters;
  var speakingKey = props.speakingKey;
  var userName = props.userName;
  var emptyChair = props.emptyChair;
  
  var allChars = Object.entries(characters);
  
  return (
    <div className="py-3">
      <div className="flex items-center justify-center gap-1 flex-wrap">
        {allChars.slice(0, 7).map(function(entry) {
          var key = entry[0];
          var char = entry[1];
          var isSpeaking = speakingKey === key;
          return (
            <div key={key} className="flex flex-col items-center mx-1">
              <div 
                className={"w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-bold shadow-lg transition-all duration-300 " + (isSpeaking ? "ring-2 ring-offset-2 ring-offset-gray-900 ring-amber-400 scale-110" : "opacity-60")}
                style={{backgroundColor: char.color}}
              >
                {char.avatar || char.name[0]}
              </div>
              <span className={"text-[8px] mt-1 transition-colors truncate max-w-[40px] " + (isSpeaking ? "text-amber-400" : "text-gray-600")}>{char.name}</span>
            </div>
          );
        })}
        <div className="flex flex-col items-center mx-1">
          <div className={"w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-bold shadow-lg bg-gradient-to-br from-blue-500 to-blue-700 transition-all duration-300 " + (speakingKey === 'user' ? "ring-2 ring-offset-2 ring-offset-gray-900 ring-amber-400 scale-110" : "opacity-60")}>
            {userName ? userName[0].toUpperCase() : 'Y'}
          </div>
          <span className={"text-[8px] mt-1 " + (speakingKey === 'user' ? "text-amber-400" : "text-gray-600")}>You</span>
        </div>
        {emptyChair && (
          <div className="flex flex-col items-center mx-1 opacity-40">
            <div className="w-9 h-9 rounded-full border-2 border-dashed border-gray-600 flex items-center justify-center">
              <span className="text-gray-600 text-xs">○</span>
            </div>
            <span className="text-[8px] mt-1 text-gray-700 italic">empty</span>
          </div>
        )}
      </div>
    </div>
  );
}

function Avatar(props) {
  var char = props.char;
  return (
    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 shadow-lg" style={{backgroundColor: char ? char.color : '#666'}}>
      {char ? (char.avatar || char.name[0]) : '?'}
    </div>
  );
}

function Message(props) {
  var character = props.character;
  var text = props.text;
  var isUser = props.isUser;
  var canExpand = props.canExpand;
  var isExpanded = props.isExpanded;
  var onExpand = props.onExpand;
  var isLoading = props.isLoading;
  var userName = props.userName;
  var isAction = props.isAction;
  var isInterruption = props.isInterruption;
  
  if (isAction) {
    return (
      <div className="flex justify-center py-1">
        <span className="text-gray-500 text-xs italic">{text}</span>
      </div>
    );
  }
  
  return (
    <div className={"flex gap-2 " + (isUser ? "flex-row-reverse" : "") + (isInterruption ? " -mt-2" : "")}>
      {!isUser ? (
        <Avatar char={character}/>
      ) : (
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-[10px] font-bold shrink-0 shadow-lg">
          {userName ? userName[0].toUpperCase() : 'Y'}
        </div>
      )}
      <div className={"flex flex-col max-w-[80%] " + (isUser ? "items-end" : "")}>
        {!isUser && character && !isInterruption && (
          <span className="text-[9px] text-gray-500 mb-0.5 ml-1">{character.name} <span className="text-gray-700">•</span> <span className="text-gray-600">{character.cleanTime}</span></span>
        )}
        <div 
          className={"rounded-2xl px-3 py-2 shadow-lg " + (isUser ? "bg-gradient-to-br from-blue-600 to-blue-700" : "bg-gray-800/90 border border-gray-700/50")}
          style={!isUser && character ? {borderLeftWidth: '3px', borderLeftColor: character.color} : {}}
        >
          {isLoading ? (
            <div className="flex gap-1 py-1 px-1">
              <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"/>
              <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}/>
              <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}/>
            </div>
          ) : (
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-gray-100">{text}</p>
          )}
        </div>
        {canExpand && !isExpanded && !isLoading && (
          <button onClick={onExpand} className="text-[9px] text-amber-500 hover:text-amber-400 mt-1 ml-1">Tell me more ↓</button>
        )}
      </div>
    </div>
  );
}

function SystemMessage(props) {
  var text = props.text;
  var highlight = props.highlight;
  var isResource = props.isResource;
  var isEmptyChair = props.isEmptyChair;
  
  if (isResource) {
    return (
      <div className="mx-2 my-3 p-4 bg-red-950/50 border border-red-900/50 rounded-xl text-center">
        <p className="text-red-400 text-sm whitespace-pre-wrap">{text}</p>
      </div>
    );
  }
  
  if (isEmptyChair) {
    return (
      <div className="mx-2 my-4 p-4 bg-gray-800/30 border border-gray-700/30 rounded-xl text-center">
        <div className="w-8 h-8 rounded-full border-2 border-dashed border-gray-600 mx-auto mb-2 flex items-center justify-center">
          <span className="text-gray-600">○</span>
        </div>
        <p className="text-gray-500 text-xs italic">{text}</p>
      </div>
    );
  }
  
  if (highlight) {
    return (
      <div className="text-center py-3">
        <span className="text-amber-400 font-medium text-sm bg-amber-400/10 px-4 py-2 rounded-full">{text}</span>
      </div>
    );
  }
  
  return <div className="text-center py-2"><span className="text-gray-600 text-[10px] italic">{text}</span></div>;
}

function SummaryModal(props) {
  var isOpen = props.isOpen;
  var onClose = props.onClose;
  var summary = props.summary;
  var isLoading = props.isLoading;
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-md w-full max-h-[80vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-800">
          <h3 className="text-lg font-semibold text-amber-400">Meeting Reflection</h3>
        </div>
        <div className="p-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="flex gap-2">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce"/>
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}/>
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}/>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{summary}</div>
          )}
        </div>
        <div className="p-4 border-t border-gray-800">
          <button onClick={onClose} className="w-full bg-gray-800 hover:bg-gray-700 rounded-xl py-2 text-sm transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RecoveryMeeting() {
  const [phase, setPhase] = useState('setup-name');
  const [userName, setUserName] = useState('');
  const [userCleanTime, setUserCleanTime] = useState('');
  const [userMood, setUserMood] = useState('');
  const [userMind, setUserMind] = useState('');
  const [messages, setMessages] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [userInput, setUserInput] = useState('');
  const [userShares, setUserShares] = useState([]);
  const [meetingContext, setMeetingContext] = useState([]);
  const [characters, setCharacters] = useState({});
  const [speakingOrder, setSpeakingOrder] = useState([]);
  const [speakingKey, setSpeakingKey] = useState(null);
  const [crisisMode, setCrisisMode] = useState(false);
  const [listeningOnly, setListeningOnly] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryText, setSummaryText] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [hardQuestionAsked, setHardQuestionAsked] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(function() {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  function initializeCharacters() {
    var r1 = generateRandomCharacter([]);
    var r2 = generateRandomCharacter([r1.name]);
    var all = Object.assign({}, coreCharacters, {
      random1: Object.assign({}, r1, { key: 'random1' }),
      random2: Object.assign({}, r2, { key: 'random2' })
    });
    setCharacters(all);
    var others = ['heather', 'meechie', 'gemini', 'gypsy', 'chrystal', 'random1', 'random2'];
    others.sort(function() { return Math.random() - 0.5; });
    setSpeakingOrder(others);
    return all;
  }

  function addMessage(msg) {
    var m = Object.assign({}, msg, { id: Date.now() + Math.random() });
    setMessages(function(prev) { return prev.concat([m]); });
    return m;
  }

  function updateMessage(id, updates) {
    setMessages(function(prev) {
      return prev.map(function(m) {
        return m.id === id ? Object.assign({}, m, updates) : m;
      });
    });
  }

  function delay(ms) {
    return new Promise(function(resolve) { setTimeout(resolve, ms); });
  }

  async function generateAI(prompt) {
    try {
      var response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 600,
          messages: [{ role: 'user', content: prompt }]
        })
      });
      var data = await response.json();
      return (data.content && data.content[0] && data.content[0].text) ? data.content[0].text : "...";
    } catch (e) {
      return "...";
    }
  }

  async function generateShare(charKey, context, options) {
    options = options || {};
    var char = characters[charKey];
    if (!char) return "...";
    
    var contextStr = context.map(function(c) { return c.speaker + ": " + c.text; }).join("\n");
    var userContext = userMind ? " On their mind: " + userMind : "";
    
    var prompt = "You are " + char.name + " at a recovery meeting.\n\n" +
      "CHARACTER:\n- " + char.archetype + "\n- Clean time: " + char.cleanTime + "\n- Voice: " + char.voice + "\n- Wound: " + char.wound + "\n- Quirk: " + char.quirk + "\n\n" +
      "TOPIC: " + (options.topic || selectedTopic) + "\n" +
      "USER: " + userName + " (" + userCleanTime + ", " + userMood + ")" + userContext + "\n\n" +
      "WHAT'S BEEN SHARED:\n" + contextStr + "\n\n";
    
    if (options.userShare) {
      prompt += userName + " JUST SHARED: \"" + options.userShare + "\"" + (options.isHeavy ? " [heavy - respond with weight]" : "") + "\n\n";
    }
    if (options.respondTo) prompt += "BUILD ON what " + options.respondTo.speaker + " said.\n";
    if (options.disagreeWith) prompt += "PUSH BACK on " + options.disagreeWith.speaker + " - you see it different.\n";
    if (options.parallelStory) prompt += "Your wound connects to what " + userName + " shared - make that connection.\n";
    
    prompt += "\nGenerate " + char.name + "'s share. " + (options.isExpanded ? "8-10 sentences, go deep." : "3-4 sentences.") + "\n\n" +
      "RULES:\n- NO therapy speak (journey, healing, boundaries, triggers, self-care, process)\n- Real talk, specific details, dark humor OK\n- Include a physical action or quirk occasionally (*shifts in seat*, *takes a breath*)\n- Stay in character voice\n- Output ONLY the share";

    return await generateAI(prompt);
  }

  async function generateIntro(charKey) {
    var char = characters[charKey];
    if (!char) return "...";
    
    var prompt = "You are " + char.name + " introducing yourself at a recovery meeting.\n\n" +
      "CHARACTER: " + char.archetype + ", " + char.cleanTime + " clean. Voice: " + char.voice + ". Quirk: " + (char.introStyle || char.quirk) + "\n\n" +
      "Generate a brief introduction. NOT just 'I'm [name], I'm an addict.' Be real:\n" +
      "- Some people just wave or nod\n- Some say 'y'all know me'\n- Newcomers might stumble or say too much\n- Some mention their clean time, some don't\n- Include a small action (*clears throat*, *waves*, *nods*) sometimes\n\n" +
      "Keep it to 1-2 sentences max. Output ONLY the introduction.";

    return await generateAI(prompt);
  }

  async function generateCrosstalk(fromChar, toChar, context, type) {
    var prompt = "You are " + fromChar + " at a recovery meeting. " + toChar + " just shared.\n\n" +
      "Generate a brief reaction (" + type + "):\n" +
      "- Could be agreement: 'Facts.' 'That's real.'\n" +
      "- Could be a question: 'Wait, what do you mean by...'\n" +
      "- Could be disagreement: 'I don't know about that...'\n" +
      "- Could be a small interruption: 'Sorry but I gotta say...'\n\n" +
      "Keep it to ONE short sentence or phrase. Real, not polished. Output ONLY the reaction.";

    return await generateAI(prompt);
  }

  async function generateHardQuestion(context) {
    var prompt = "You are a character at a recovery meeting. " + userName + " has been sharing but might be avoiding something.\n\n" +
      "USER INFO: " + userName + ", " + userCleanTime + ", " + userMood + (userMind ? ". On their mind: " + userMind : "") + "\n\n" +
      "WHAT THEY'VE SHARED:\n" + userShares.join("\n") + "\n\n" +
      "Ask THE HARD QUESTION - the thing nobody else will ask. Not cruel, but direct. The question that cuts through the bullshit.\n" +
      "Examples of tone:\n" +
      "- 'Are you actually working a program or just coming to meetings?'\n" +
      "- 'You keep talking about them. What's your part in it?'\n" +
      "- 'When's the last time you were honest with yourself?'\n\n" +
      "Make it specific to what they've shared. One question. Output ONLY the question.";

    return await generateAI(prompt);
  }

  async function generateSummary() {
    var allShares = userShares.filter(function(s) { return s !== '[passed]'; });
    if (allShares.length === 0) {
      return "You listened today. Sometimes that's exactly what we need. The room held space for you, and you were here. That matters.\n\nIf there's something you wanted to say but couldn't, it'll still be there next time. Keep coming back.";
    }
    
    var prompt = "You are a wise, caring recovery mentor (NOT a therapist). A person just finished a recovery meeting.\n\n" +
      "USER: " + userName + ", " + userCleanTime + ", came in feeling " + userMood + (userMind ? ". On their mind: " + userMind : "") + "\n\n" +
      "WHAT THEY SHARED DURING THE MEETING:\n" + allShares.map(function(s,i) { return (i+1) + ". \"" + s + "\""; }).join("\n") + "\n\n" +
      "TOPIC DISCUSSED: " + selectedTopic + "\n\n" +
      "Write a brief, personal reflection for them. Include:\n\n" +
      "1. WHAT YOU SHARED: Brief, non-judgmental summary of their contributions\n\n" +
      "2. THEMES I NOTICED: What patterns or themes came up? (2-3 sentences)\n\n" +
      "3. A QUESTION TO SIT WITH: One question for them to reflect on before next meeting\n\n" +
      "4. WHAT I'D TELL YOU: One piece of real talk - not inspiration, not therapy speak. What would Marcus or Heather say to them?\n\n" +
      "Keep it warm but real. NO therapy language. Write like someone who's been there.";

    return await generateAI(prompt);
  }

  async function handleCrisis() {
    setCrisisMode(true);
    await delay(1000);
    
    addMessage({ type: 'system', text: '— room goes quiet —' });
    await delay(2000);
    
    setSpeakingKey('marcus');
    var marcusMsg = addMessage({ charKey: 'marcus', character: characters.marcus, isLoading: true });
    var marcusText = await generateAI(
      "You are Marcus, 12 years clean, chairing a meeting. " + userName + " just expressed something that sounds like crisis/suicidal ideation.\n\n" +
      "Respond with:\n- Stop the meeting energy - this matters more\n- Share that you've been there too\n- Don't panic, don't get clinical\n- Let them know the room is here\n\n2-3 sentences. Real. Output ONLY your response."
    );
    updateMessage(marcusMsg.id, { text: marcusText, isLoading: false });
    
    await delay(2500);
    setSpeakingKey('heather');
    var heatherMsg = addMessage({ charKey: 'heather', character: characters.heather, isLoading: true });
    var heatherText = await generateAI(
      "You are Heather, 2 weeks clean, intense survivor. " + userName + " just expressed crisis/suicidal thoughts. Marcus just responded.\n\n" +
      "Share your own moment when you felt the same. Be specific but not graphic. Let them know they're not alone. 2-3 sentences. Output ONLY your response."
    );
    updateMessage(heatherMsg.id, { text: heatherText, isLoading: false });
    
    await delay(2000);
    setSpeakingKey(null);
    addMessage({ type: 'system', text: "If you're in crisis:\n988 — Suicide & Crisis Lifeline\n1-800-662-4357 — SAMHSA\n\nYou can stay here with us.", isResource: true });
    
    await delay(1500);
    setSpeakingKey('marcus');
    addMessage({ charKey: 'marcus', character: characters.marcus, text: userName + ", you don't gotta say anything else. But we ain't going nowhere. What do you need right now?" });
    setPhase('crisis-response');
  }

  function startMeeting() {
    var chars = initializeCharacters();
    setPhase('meeting');
    runMeeting(chars);
  }

  async function runMeeting(chars) {
    await delay(500);
    
    // Empty chair moment
    addMessage({ type: 'system', text: "This chair stays empty for everyone who couldn't make it tonight — and everyone who didn't make it at all.", isEmptyChair: true });
    await delay(3000);
    
    // Marcus opens
    setSpeakingKey('marcus');
    var openingMsg = addMessage({ charKey: 'marcus', character: chars.marcus, isLoading: true });
    var opening = await generateAI(
      "You are Marcus, 12 years clean, chairing a recovery meeting.\n\n" +
      "USER IN ROOM: " + userName + ", " + userCleanTime + ", showed up feeling " + userMood + (userMind ? ". On their mind: " + userMind : "") + "\n\n" +
      "Open the meeting:\n- Welcome everyone, acknowledge " + userName + " by name\n- If they're struggling or new, acknowledge that gently\n- Keep it warm, real, not scripted\n- Include a small action (*looks around room*, *sets down coffee*)\n- State the only requirement is a desire to stop using\n\n3-4 sentences. Output ONLY your opening."
    );
    updateMessage(openingMsg.id, { text: opening, isLoading: false });
    
    await delay(3000);
    addMessage({ type: 'system', text: '— moment of silence —' });
    await delay(3000);
    
    // Reading
    setSpeakingKey('chrystal');
    addMessage({ isAction: true, text: "Chrystal pulls out a folded paper" });
    await delay(800);
    var readingMsg = addMessage({ charKey: 'chrystal', character: chars.chrystal, isLoading: true });
    var reading = await generateAI(
      "Generate a short recovery meeting reading (3-4 sentences).\n\n" +
      "NOT from AA/NA literature - original content.\n" +
      "Tone: Hard-hitting, street wisdom, accountability. NOT soft inspiration.\n" +
      "Think: The uncomfortable truth people need to hear.\n\nOutput ONLY the reading."
    );
    updateMessage(readingMsg.id, { text: reading, isLoading: false });
    
    await delay(3500);
    
    // Quick intros
    addMessage({ type: 'system', text: '— introductions —' });
    await delay(800);
    
    var introOrder = ['marcus', 'heather', 'meechie', 'gemini', 'gypsy', 'chrystal', 'random1', 'random2'];
    for (var i = 0; i < introOrder.length; i++) {
      var k = introOrder[i];
      setSpeakingKey(k);
      var introMsg = addMessage({ charKey: k, character: chars[k], isLoading: true });
      var intro = await generateIntro(k);
      updateMessage(introMsg.id, { text: intro, isLoading: false });
      
      // Quick group response (not for everyone)
      if (Math.random() > 0.5) {
        await delay(400);
        addMessage({ type: 'system', text: "Hi " + chars[k].name });
      }
      await delay(600);
    }
    
    setSpeakingKey('user');
    setPhase('user-intro');
  }

  async function handleUserIntro() {
    var introText = "I'm " + userName + ". I'm an addict.";
    if (userCleanTime && userCleanTime !== 'Rather not say') {
      introText += " " + userCleanTime + ".";
    }
    addMessage({ isUser: true, text: introText, userName: userName });
    addMessage({ type: 'system', text: "Hi " + userName + "!" });
    setSpeakingKey(null);
    
    await delay(1200);
    
    // Sometimes someone says something extra
    if (['This is my first meeting', 'Less than a week', 'I\'m not clean right now'].indexOf(userCleanTime) !== -1) {
      var welcomer = Math.random() > 0.5 ? 'heather' : 'marcus';
      setSpeakingKey(welcomer);
      var welcomeMsg = addMessage({ charKey: welcomer, character: characters[welcomer], isLoading: true });
      var welcome = await generateAI(
        "You are " + characters[welcomer].name + " at a recovery meeting. " + userName + " just introduced themselves - they have " + userCleanTime + ".\n\n" +
        "Give a brief, warm acknowledgment. NOT generic. Be real. One sentence. Include an action (*nods*, *makes eye contact*). Output ONLY your response."
      );
      updateMessage(welcomeMsg.id, { text: welcome, isLoading: false });
      await delay(1500);
    }
    
    setSpeakingKey('marcus');
    var topicPrompt = addMessage({ charKey: 'marcus', character: characters.marcus, isLoading: true });
    var topicText = await generateAI(
      "You are Marcus, chairing a meeting. Ask what topic people want to discuss. Keep it casual, one sentence. Output ONLY your line."
    );
    updateMessage(topicPrompt.id, { text: topicText, isLoading: false });
    setPhase('topic-choosing');
  }

  async function handleTopicSelect(topic) {
    setSelectedTopic(topic);
    setPhase('discussion');
    
    setSpeakingKey('marcus');
    var topicAck = addMessage({ charKey: 'marcus', character: characters.marcus, isLoading: true });
    var ack = await generateAI(
      "You are Marcus. Topic selected: '" + topic + "'. Acknowledge it briefly and open discussion. Include a small action. 1-2 sentences. Output ONLY your response."
    );
    updateMessage(topicAck.id, { text: ack, isLoading: false });
    await delay(1500);

    var ctx = [];
    var firstTwo = speakingOrder.slice(0, 2);
    
    // First share
    var k1 = firstTwo[0];
    setSpeakingKey(k1);
    var msg1 = addMessage({ charKey: k1, character: characters[k1], isLoading: true });
    var share1 = await generateShare(k1, ctx, { topic: topic });
    updateMessage(msg1.id, { text: share1, isLoading: false, canExpand: true });
    ctx.push({ speaker: characters[k1].name, text: share1 });
    
    await delay(2000);
    
    // Possible crosstalk reaction
    if (Math.random() > 0.6) {
      var reactor = firstTwo[1];
      var reaction = await generateCrosstalk(characters[reactor].name, characters[k1].name, ctx, "brief agreement or reaction");
      addMessage({ charKey: reactor, character: characters[reactor], text: reaction, isInterruption: true });
      await delay(1000);
    }
    
    // Second share
    var k2 = firstTwo[1];
    setSpeakingKey(k2);
    var msg2 = addMessage({ charKey: k2, character: characters[k2], isLoading: true });
    var share2 = await generateShare(k2, ctx, { topic: topic, respondTo: ctx[0] });
    updateMessage(msg2.id, { text: share2, isLoading: false, canExpand: true });
    ctx.push({ speaker: characters[k2].name, text: share2 });
    
    setMeetingContext(ctx);
    await delay(1500);
    
    setSpeakingKey(null);
    if (!listeningOnly) {
      setPhase('user-response-1');
    } else {
      await runRound2('', false);
    }
  }

  async function handleUserShare(passed) {
    var txt = passed ? '' : userInput.trim();
    if (!passed && !txt) return;
    
    if (passed) {
      addMessage({ type: 'system', text: userName + " passes" });
      setUserShares(function(prev) { return prev.concat(['[passed]']); });
    } else {
      setSpeakingKey('user');
      addMessage({ isUser: true, text: txt, userName: userName });
      setUserShares(function(prev) { return prev.concat([txt]); });
      if (detectCrisis(txt)) {
        setUserInput('');
        await handleCrisis();
        return;
      }
    }
    setUserInput('');
    setSpeakingKey(null);
    
    var heavy = !passed && detectHeavy(txt);
    
    if (phase === 'user-response-1') await runRound2(txt, heavy);
    else if (phase === 'user-response-2') await runRound3(txt, heavy);
    else if (phase === 'user-final' || phase === 'crisis-response') await runClosing(txt, heavy);
  }

  async function runRound2(userShare, isHeavy) {
    setPhase('discussion');
    var ctx = meetingContext.slice();
    await delay(1000);

    if (isHeavy && userShare) {
      addMessage({ isAction: true, text: "silence in the room" });
      await delay(2000);
      setSpeakingKey('marcus');
      var heavyResp = addMessage({ charKey: 'marcus', character: characters.marcus, isLoading: true });
      var heavyText = await generateAI(
        "You are Marcus. " + userName + " just shared something heavy: \"" + userShare.substring(0, 150) + "\"\n\n" +
        "Acknowledge it with weight. Not performative. Real. Include an action (*leans forward*, *nods slowly*). 1-2 sentences. Output ONLY your response."
      );
      updateMessage(heavyResp.id, { text: heavyText, isLoading: false });
      await delay(1500);
    } else if (userShare && userShare !== '[passed]') {
      // Brief acknowledgment
      if (Math.random() > 0.5) {
        var acker = speakingOrder[Math.floor(Math.random() * 3)];
        addMessage({ charKey: acker, character: characters[acker], text: "That's real.", isInterruption: true });
        await delay(800);
      }
    }

    // Check for parallel story
    var parallelChar = null;
    if (userShare && userShare !== '[passed]') {
      var lowerShare = userShare.toLowerCase();
      if (lowerShare.includes('daughter') || lowerShare.includes('kid') || lowerShare.includes('custody')) parallelChar = 'marcus';
      else if (lowerShare.includes('prison') || lowerShare.includes('jail') || lowerShare.includes('locked up')) parallelChar = 'heather';
      else if (lowerShare.includes('relapse') || lowerShare.includes('slip')) parallelChar = 'gemini';
      else if (lowerShare.includes('running') || lowerShare.includes('city') || lowerShare.includes('moved')) parallelChar = 'gypsy';
    }

    var nextTwo = speakingOrder.slice(2, 4);
    
    for (var i = 0; i < nextTwo.length; i++) {
      var k = nextTwo[i];
      if (parallelChar && i === 0 && nextTwo.indexOf(parallelChar) === -1) {
        k = parallelChar; // Swap in the character whose story parallels
      }
      
      setSpeakingKey(k);
      var msg = addMessage({ charKey: k, character: characters[k], isLoading: true });
      var opts = {
        topic: selectedTopic,
        userShare: userShare !== '[passed]' ? userShare : null,
        isHeavy: isHeavy,
        parallelStory: k === parallelChar
      };
      if (i === 1 && Math.random() > 0.6) {
        opts.disagreeWith = ctx[ctx.length - 1];
      } else if (i === 1) {
        opts.respondTo = ctx[ctx.length - 1];
      }
      
      var share = await generateShare(k, ctx, opts);
      updateMessage(msg.id, { text: share, isLoading: false, canExpand: true });
      ctx.push({ speaker: characters[k].name, text: share });
      setMeetingContext(ctx);
      await delay(2000);
    }

    setSpeakingKey(null);
    if (!listeningOnly) {
      // Someone asks user directly
      var asker = speakingOrder[Math.floor(Math.random() * 4)];
      setSpeakingKey(asker);
      var questionMsg = addMessage({ charKey: asker, character: characters[asker], isLoading: true });
      var question = await generateAI(
        "You are " + characters[asker].name + " (" + characters[asker].archetype + "). Ask " + userName + " a direct question about how this topic lands for them. In your voice. One sentence. Output ONLY the question."
      );
      updateMessage(questionMsg.id, { text: question, isLoading: false });
      setPhase('user-response-2');
    } else {
      await runRound3('', false);
    }
  }

  async function runRound3(userShare, isHeavy) {
    setPhase('discussion');
    var ctx = meetingContext.slice();
    await delay(1000);

    if (isHeavy) {
      addMessage({ isAction: true, text: "weight in the room" });
      await delay(1500);
    }

    // Hard question (if user has shared and we haven't asked yet)
    if (!hardQuestionAsked && userShares.filter(function(s) { return s !== '[passed]'; }).length >= 2) {
      setHardQuestionAsked(true);
      var hardAsker = Math.random() > 0.5 ? 'meechie' : 'marcus';
      setSpeakingKey(hardAsker);
      var hardMsg = addMessage({ charKey: hardAsker, character: characters[hardAsker], isLoading: true });
      var hardQ = await generateHardQuestion(ctx);
      updateMessage(hardMsg.id, { text: hardQ, isLoading: false });
      await delay(2500);
    }

    var lastTwo = speakingOrder.slice(4, 6);
    
    for (var i = 0; i < lastTwo.length; i++) {
      var k = lastTwo[i];
      setSpeakingKey(k);
      var msg = addMessage({ charKey: k, character: characters[k], isLoading: true });
      var share = await generateShare(k, ctx, {
        topic: selectedTopic,
        userShare: userShare !== '[passed]' ? userShare : null,
        isHeavy: isHeavy,
        respondTo: ctx[ctx.length - 1]
      });
      updateMessage(msg.id, { text: share, isLoading: false, canExpand: true });
      ctx.push({ speaker: characters[k].name, text: share });
      setMeetingContext(ctx);
      await delay(2000);
    }

    setSpeakingKey('marcus');
    var closingPrompt = addMessage({ charKey: 'marcus', character: characters.marcus, isLoading: true });
    var prompt = await generateAI(
      "You are Marcus, closing out discussion. Ask " + userName + " directly if there's anything else they need to say before you close. Be direct but warm. One sentence. Output ONLY your line."
    );
    updateMessage(closingPrompt.id, { text: prompt, isLoading: false });
    setPhase('user-final');
  }

  async function runClosing(userShare, isHeavy) {
    setPhase('closing');
    setSpeakingKey('marcus');
    await delay(1000);

    if (userShare && userShare !== '[passed]') {
      var respMsg = addMessage({ charKey: 'marcus', character: characters.marcus, isLoading: true });
      var resp = await generateAI(
        "You are Marcus. " + userName + " just shared a final thought" + (isHeavy ? " (heavy content)" : "") + ": \"" + userShare.substring(0, 100) + "\"\n\n" +
        "Acknowledge it briefly. If heavy, honor the weight. 1 sentence. Output ONLY your response."
      );
      updateMessage(respMsg.id, { text: resp, isLoading: false });
      await delay(1500);
    }

    var closingMsg = addMessage({ charKey: 'marcus', character: characters.marcus, isLoading: true });
    var closing = await generateAI(
      "You are Marcus, closing the meeting.\n- Thank everyone\n- Specifically acknowledge " + userName + " for showing up\n- 'What we share here stays here'\n- Include an action\n\n2-3 sentences. Output ONLY your closing."
    );
    updateMessage(closingMsg.id, { text: closing, isLoading: false });
    
    await delay(2000);
    
    // Someone else says goodbye to user
    var goodbye = Math.random() > 0.5 ? 'heather' : speakingOrder[0];
    setSpeakingKey(goodbye);
    var goodbyeMsg = addMessage({ charKey: goodbye, character: characters[goodbye], isLoading: true });
    var goodbyeText = await generateAI(
      "You are " + characters[goodbye].name + ". Meeting is ending. Say something personal and welcoming to " + userName + " - they're part of this now. One sentence. Real, not cheesy. Output ONLY your line."
    );
    updateMessage(goodbyeMsg.id, { text: goodbyeText, isLoading: false });
    
    await delay(1500);
    setSpeakingKey(null);
    addMessage({ type: 'system', text: '— Keep coming back —', highlight: true });
    setPhase('done');
  }

  async function handleExpand(msgId, charKey) {
    var msg = null;
    for (var i = 0; i < messages.length; i++) {
      if (messages[i].id === msgId) { msg = messages[i]; break; }
    }
    if (!msg || msg.isExpanded) return;
    updateMessage(msgId, { isLoading: true, canExpand: false });
    var txt = await generateShare(charKey, meetingContext, { isExpanded: true, topic: selectedTopic });
    updateMessage(msgId, { text: txt, isLoading: false, isExpanded: true });
  }

  async function handleGenerateSummary() {
    setSummaryLoading(true);
    setShowSummary(true);
    var summary = await generateSummary();
    setSummaryText(summary);
    setSummaryLoading(false);
  }

  var prompts = {
    'user-response-1': "What comes up for you?",
    'user-response-2': "How does this land?",
    'user-final': "Anything else before we close?",
    'crisis-response': "Take your time. We're here."
  };

  // Setup screens
  if (phase === 'setup-name') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black text-white flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-600/20 flex items-center justify-center mx-auto mb-6 border border-amber-500/30">
              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 animate-pulse shadow-lg shadow-amber-500/50"/>
            </div>
            <h1 className="text-2xl font-bold mb-2 bg-gradient-to-r from-amber-200 to-orange-300 bg-clip-text text-transparent">Virtual Recovery Meeting</h1>
            <p className="text-gray-500 text-sm">A room that's always open</p>
          </div>
          <div className="bg-gray-800/50 backdrop-blur p-6 rounded-2xl border border-gray-700/50">
            <label className="block text-sm text-gray-400 mb-2">What should we call you?</label>
            <input 
              type="text" value={userName} 
              onChange={function(e) { setUserName(e.target.value); }}
              onKeyDown={function(e) { if (e.key === 'Enter' && userName.trim()) setPhase('setup-time'); }}
              className="w-full bg-gray-900/80 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 mb-4" 
              placeholder="First name or alias"
            />
            <button 
              onClick={function() { if (userName.trim()) setPhase('setup-time'); }}
              disabled={!userName.trim()} 
              className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:from-gray-700 disabled:to-gray-700 rounded-xl px-4 py-3 font-medium transition-all"
            >
              Continue
            </button>
          </div>
          <p className="text-center text-xs text-gray-600">In crisis? <span className="text-red-400">988</span></p>
        </div>
      </div>
    );
  }

  if (phase === 'setup-time') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black text-white flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-4">
          <h2 className="text-lg font-medium text-center">Clean time, {userName}?</h2>
          <p className="text-gray-500 text-xs text-center">No judgment</p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {cleanTimeOptions.map(function(opt) {
              return (
                <button key={opt} onClick={function() { setUserCleanTime(opt); setPhase('setup-mood'); }}
                  className="w-full text-left bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700/50 rounded-xl px-4 py-3 text-sm transition-all">
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'setup-mood') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black text-white flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-4">
          <h2 className="text-lg font-medium text-center">How you showing up?</h2>
          <div className="grid grid-cols-2 gap-2">
            {moods.map(function(m) {
              return (
                <button key={m} onClick={function() { setUserMood(m); setPhase('setup-mind'); }}
                  className="bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700/50 rounded-xl px-3 py-3 text-sm transition-all">
                  {m}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'setup-mind') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black text-white flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-4">
          <h2 className="text-lg font-medium text-center">Anything on your mind?</h2>
          <p className="text-gray-500 text-xs text-center">Optional — the room can hold it</p>
          <textarea value={userMind} onChange={function(e) { setUserMind(e.target.value); }}
            className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-3 text-white focus:outline-none resize-none" 
            rows={3} placeholder="Family, cravings, something that happened..."
          />
          <button onClick={startMeeting} className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 rounded-xl px-4 py-3 font-medium transition-all">
            Join Meeting
          </button>
          <div className="flex gap-2">
            <button onClick={function() { setUserMind(''); startMeeting(); }} className="flex-1 text-gray-500 hover:text-gray-300 text-sm py-2">
              Skip
            </button>
            <button onClick={function() { setListeningOnly(true); startMeeting(); }} className="flex-1 text-gray-500 hover:text-gray-300 text-sm py-2">
              Just listening
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Meeting
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black text-white flex flex-col">
      <SummaryModal isOpen={showSummary} onClose={function() { setShowSummary(false); }} summary={summaryText} isLoading={summaryLoading}/>
      
      <div className="bg-gray-900/80 backdrop-blur border-b border-gray-800 px-3 pt-1">
        <MeetingCircle characters={characters} speakingKey={speakingKey} userName={userName} emptyChair={true}/>
        {selectedTopic && <p className="text-[9px] text-gray-600 text-center pb-2 truncate">{selectedTopic}</p>}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map(function(msg) {
          if (msg.type === 'system') return <SystemMessage key={msg.id} text={msg.text} highlight={msg.highlight} isResource={msg.isResource} isEmptyChair={msg.isEmptyChair}/>;
          if (msg.isAction) return <Message key={msg.id} isAction={true} text={msg.text}/>;
          return (
            <Message key={msg.id} character={msg.character} text={msg.text} isUser={msg.isUser} canExpand={msg.canExpand} isExpanded={msg.isExpanded} isLoading={msg.isLoading} 
              onExpand={function() { handleExpand(msg.id, msg.charKey); }} userName={userName} isInterruption={msg.isInterruption}/>
          );
        })}
        <div ref={messagesEndRef}/>
      </div>

      <div className="bg-gray-900/80 backdrop-blur border-t border-gray-800 p-3">
        {phase === 'user-intro' && (
          <button onClick={handleUserIntro} className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 rounded-xl px-4 py-3 font-medium">
            Introduce yourself
          </button>
        )}

        {phase === 'topic-choosing' && (
          <div className="space-y-2 max-h-44 overflow-y-auto">
            <p className="text-[10px] text-gray-500">What do you want to talk about?</p>
            {topics.map(function(t) {
              return (
                <button key={t} onClick={function() { handleTopicSelect(t); }}
                  className="w-full text-left bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700/50 rounded-xl px-3 py-2 text-sm transition-all">
                  {t}
                </button>
              );
            })}
          </div>
        )}

        {['user-response-1', 'user-response-2', 'user-final', 'crisis-response'].indexOf(phase) !== -1 && (
          <div className="space-y-2">
            <p className="text-[10px] text-gray-500">{prompts[phase]}</p>
            <textarea value={userInput} onChange={function(e) { setUserInput(e.target.value); }}
              className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl px-3 py-2 text-sm text-white focus:outline-none resize-none" 
              rows={2} placeholder={crisisMode ? "Take your time..." : "Share what's real..."}
            />
            <div className="flex gap-2">
              <button onClick={function() { handleUserShare(false); }} disabled={!userInput.trim()} 
                className="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:from-gray-700 disabled:to-gray-700 rounded-xl px-4 py-2 text-sm font-medium">
                Share
              </button>
              <button onClick={function() { handleUserShare(true); }} className="px-4 py-2 text-gray-500 hover:text-gray-300 text-sm">
                Pass
              </button>
            </div>
          </div>
        )}

        {phase === 'discussion' && (
          <div className="flex justify-center py-2">
            <div className="flex gap-1.5 bg-gray-800/50 px-4 py-2 rounded-full">
              <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce"/>
              <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}/>
              <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}/>
            </div>
          </div>
        )}

        {phase === 'done' && (
          <div className="text-center space-y-3">
            <p className="text-gray-500 text-sm">Meeting's over. You showed up.</p>
            <div className="flex gap-2">
              <button onClick={handleGenerateSummary} className="flex-1 bg-gray-800 hover:bg-gray-700 rounded-xl py-2 text-sm">
                Meeting reflection
              </button>
              <button onClick={function() { window.location.reload(); }} className="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 rounded-xl py-2 text-sm">
                New meeting
              </button>
            </div>
          </div>
        )}

        {phase === 'closing' && (
          <div className="flex justify-center py-2">
            <span className="text-gray-600 text-xs">Closing out...</span>
          </div>
        )}
      </div>
    </div>
  );
}