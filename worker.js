const CATEGORIES = [
  {name:'Opinions',words:['CHAMP','KISS+FIST','#FUN','FUN','ENJOY','LIKE','OK-OK','SO-SO','DON’T-LIKE','BORING','NOT-CRAZY','VOMIT']},
  {name:'Skills',words:['Like a professional','Awfully good at it','Expert','Skilled','Average','So-so','Inexperienced','Lousy at it','Inept/Incompetent']},
  {name:'Bravery',words:['Thrilled','Confident','Daring (risk-taking)','Tough','Struggle/Hesitate','Nervous','Chicken','Scared','Unyielding in refusal']},
  {name:'Hobbies and Interests',words:['cooking','grilling bbq','baking','playing video games','photography','reading','shopping','knitting','sewing','watching movie or TV','scrapbooking','hanging out with friends']},
  {name:'Collections',words:['coins','figurines','baseball cards','antiques','comics','stamps']},
  {name:'Sports and Recreation · Part 1',words:['Music/Band/Concert','Party/Socialize or Mingle, Chatting','Going out a date','Playing pool/Billiards','Playing cards','Play a game','Horseback riding','Camping','Beach','Swimming','Fishing','Boating']},
  {name:'Sports and Recreation · Part 2',words:['Skiing','Snowboarding','Hockey','Ice skating','Skateboard','Roller skates','Playground','Walking','Biking','Running','Golfing','Baseball or Softball']},
  {name:'Sports and Recreation · Part 3',words:['Basketball','Football','Wrestling','Karate','Boxing','Volleyball','Soccer','Bowling','Tennis','Ping Pong','Badminton','Deaflympics']},
  {name:'Vacation',words:['Roadtrip','Sightseeing','Tour','Staycation','Camping','Zoo','Amusement/Park/Carnival/Fair','Circus','Waterpark','Museum','Park','Festival']},
  {name:'Snacks · Part 1',words:['Doughnuts','Popcorn','Pizza','Chips','Cheese','Crackers','Dip','Spread','Meats','Nuts','Fruits','Vegetables']},
  {name:'Snacks · Part 2',words:['Apple','Watermelon','Banana','Orange','Pineapple','Grapes','Strawberry','Cookies','Candy']},
  {name:'Drinks',words:['Water','Milk','Juice','Smoothies','Coke','Diet Coke','Pepsi','Dr. Pepper','Root Beer','Ginger ale','7-Up','Sprite']},
  {name:'How Do You Like Your Coffee/Tea?',words:['iced','hot','black/plain','sugar','milk/cream','chocolate drizzle','whipping cream','decaf','tea']}
];

const randomIndex = (max) => crypto.getRandomValues(new Uint32Array(1))[0] % max;
function shuffle(items) {
  const out=[...items];
  for(let i=out.length-1;i>0;i--){const j=randomIndex(i+1);[out[i],out[j]]=[out[j],out[i]]}
  return out;
}
function buildDeck(){
  const deck=[];
  for(const category of CATEGORIES){
    const words=shuffle(category.words);
    for(let i=0;i<words.length;i+=6)deck.push({category:category.name,words:words.slice(i,i+6)});
  }
  return shuffle(deck);
}
function newRound(deck,index){
  const board=deck[index];const tiles=shuffle(board.words);const correct=randomIndex(tiles.length);
  return {category:board.category,tiles,target:tiles[correct],correct,phase:'waiting'};
}
function createData(){const deck=buildDeck();return {phase:'waiting',cycle:0,round:0,deck,...newRound(deck,0),players:[],answered:[],responses:{},teacherToken:null}}
function rankFor(players, id){const me=players.find(p=>p.id===id);if(!me)return 1;return 1+players.filter(p=>p.score>me.score).length}
function publicState(data){
  const scores=[...data.players].sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name));
  const leaderboard=scores.slice(0,10).map(p=>({rank:1+scores.filter(x=>x.score>p.score).length,name:p.name,score:p.score}));
  return {phase:data.phase,category:data.category,tiles:data.tiles,round:data.cycle*data.deck.length+data.round,students:data.players.length,leaderboard};
}
function safeSend(ws,payload){try{ws.send(JSON.stringify(payload))}catch{}}

export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(url.pathname.startsWith('/room/')){
      const info=url.pathname.endsWith('/info');
      const rawCode=url.pathname.slice(6,info?-5:undefined);
      const code=decodeURIComponent(rawCode).toUpperCase();
      if(!/^[A-HJ-NP-Z2-9]{6}$/.test(code))return new Response('Invalid room code',{status:400});
      const room=env.ROOM.get(env.ROOM.idFromName(code));
      if(info)return room.fetch(new Request('https://room/info'));
      if(request.headers.get('Upgrade')!=='websocket')return new Response('WebSocket required',{status:426});
      return room.fetch(request);
    }
    return env.ASSETS.fetch(request);
  }
};

export class Room {
  constructor(state){this.state=state;this.data=null;this.ready=state.storage.get('data').then(saved=>{this.data=saved||createData()})}
  async fetch(request){await this.ready;if(new URL(request.url).pathname==='/info')return Response.json({ready:Boolean(this.data.teacherToken)});const pair=new WebSocketPair();this.state.acceptWebSocket(pair[1]);pair[1].serializeAttachment({role:null,id:null});return new Response(null,{status:101,webSocket:pair[0]})}
  async webSocketMessage(ws,raw){
    await this.ready;let m;try{m=JSON.parse(raw)}catch{return}
    const a=ws.deserializeAttachment()||{};const d=this.data;
    if(m.type==='hello'){
      const role=['teacher','student','board'].includes(m.role)?m.role:'board';
      const id=typeof m.id==='string'&&m.id.length<=80?m.id:'';
      if(role==='teacher'){
        if(!/^[\w-]{10,100}$/.test(m.teacherToken||'')){safeSend(ws,{error:'Teacher authorization is missing.'});return}
        if(d.teacherToken&&d.teacherToken!==m.teacherToken){safeSend(ws,{error:'Only the teacher who created this room can control it.'});return}
        if(!d.teacherToken)d.teacherToken=m.teacherToken
      }
      if(role==='student'){
        const name=String(m.name||'').trim().replace(/\s+/g,' ').slice(0,40);
        if(!id||!name){safeSend(ws,{error:'Enter your name to join this room.'});return}
        const existing=d.players.find(p=>p.id===id);
        if(existing){existing.name=name}
        else if(d.players.some(p=>p.name.toLocaleLowerCase()===name.toLocaleLowerCase())){safeSend(ws,{error:'That name is already in this room. Add a last initial or choose a different name.'});return}
        else d.players.push({id,name,score:0});
      }
      ws.serializeAttachment({role,id,name:String(m.name||'').trim().slice(0,40),teacherToken:role==='teacher'?m.teacherToken:null});
      await this.save();this.send(ws);this.broadcast();return;
    }
    if(a.role==='teacher'&&a.teacherToken!==d.teacherToken)return;
    if(m.type==='start'&&a.role==='teacher'&&d.phase!=='active'){d.phase='active';d.answered=[];d.responses={}}
    else if(m.type==='next'&&a.role==='teacher'){
      d.round++;
      if(d.round>=d.deck.length){d.round=0;d.cycle++;d.deck=buildDeck()}
      Object.assign(d,newRound(d.deck,d.round));d.answered=[];d.responses={}
    }
    else if(m.type==='reset'&&a.role==='teacher'){const token=d.teacherToken;this.data=createData();this.data.teacherToken=token}
    else if(m.type==='answer'&&a.role==='student'&&d.phase==='active'&&!d.answered.includes(a.id)){
      const player=d.players.find(p=>p.id===a.id);const tile=Number(m.tile);
      if(!player||!Number.isInteger(tile)||tile<0||tile>=d.tiles.length)return;
      d.answered.push(a.id);d.responses[a.id]={tile,correct:tile===d.correct};
      if(tile===d.correct){player.score++;d.phase='done'}
    }else return;
    await this.save();this.broadcast();
  }
  viewFor(ws){
    const a=ws.deserializeAttachment()||{};const base={public:publicState(this.data)};
    if(a.role==='teacher'&&a.teacherToken===this.data.teacherToken)base.private={target:this.data.target};
    if(a.role==='student'){
      const player=this.data.players.find(p=>p.id===a.id);
      base.me=player?{score:player.score,rank:rankFor(this.data.players,player.id),answer:this.data.responses[player.id]||null}:null;
    }
    return base;
  }
  send(ws){safeSend(ws,this.viewFor(ws))}
  broadcast(){for(const ws of this.state.getWebSockets())this.send(ws)}
  async save(){await this.state.storage.put('data',this.data)}
}
