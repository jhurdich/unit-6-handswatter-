const CATEGORIES = [
{name:'Opinions',words:['CHAMP','KISS+FIST','#FUN','FUN','ENJOY','LIKE','OK-OK','SO-SO','DON’T-LIKE','BORING','NOT-CRAZY','VOMIT']},
{name:'Skills',words:['Like a professional','Awfully good at it','Expert','Skilled','Average','So-so','Inexperienced','Lousy at it','Inept/Incompetent']},
{name:'Bravery',words:['Thrilled','Confident','Daring (risk-taking)','Tough','Struggle / Hesitate','Nervous','Chicken','Scared','Unyielding in refusal']},
{name:'Hobbies & Interests',words:['Cooking','Grilling BBQ','Baking','Playing video games','Photography','Reading','Shopping','Knitting','Sewing','Watching movie or TV','Scrapbooking','Hanging out with friends']},
{name:'Collections',words:['Coins','Figurines','Baseball cards','Antiques','Comics','Stamps']},
{name:'Sports & Recreation, Part 1',words:['Music/Band/Concert','Party/Socialize or Mingle, Chatting','Going out a date','Playing pool/Billiards','Playing cards','Play a game','Horseback riding','Camping','Beach','Swimming','Fishing','Boating']},
{name:'Sports & Recreation, Part 2',words:['Skiing','Snowboarding','Hockey','Ice skating','Skateboard','Roller skates','Playground','Walking','Biking','Running','Golfing','Baseball or Softball']},
{name:'Sports & Recreation, Part 3',words:['Basketball','Football','Wrestling','Karate','Boxing','Volleyball','Soccer','Bowling','Tennis','Ping Pong','Badminton','Deaflympics']},
{name:'Vacation',words:['Roadtrip','Sightseeing','Tour','Staycation','Camping','Zoo','Amusement/Park/Carnival/Fair','Circus','Waterpark','Museum','Park','Festival']},
{name:'Snacks, Part 1',words:['Doughnuts','Popcorn','Pizza','Chips','Cheese','Crackers','Dip','Spread','Meats','Nuts','Fruits','Vegetables']},
{name:'Snacks, Part 2',words:['Apple','Watermelon','Banana','Orange','Pineapple','Grapes','Strawberry','Cookies','Candy']},
{name:'Drinks',words:['Water','Milk','Juice','Smoothies','Coke','Diet Coke','Pepsi','Dr. Pepper','Root Beer','Ginger ale','7-Up','Sprite']},
{name:'How Do You Like Your Coffee/Tea?',words:['Iced','Hot','Black/plain','Sugar','Milk/cream','Chocolate drizzle','Whipping cream','Decaf','Tea']}
];
const initial=()=>({version:2,token:null,round:0,phase:'ready',target:null,used:[],responses:{},correctCount:0,players:[]});
const send=(ws,obj)=>{try{ws.send(JSON.stringify(obj))}catch{}};
export default {async fetch(req,env){const u=new URL(req.url);if(u.pathname.startsWith('/room/')){const code=u.pathname.split('/')[2];if(!/^[A-HJ-NP-Z2-9]{6}$/.test(code))return new Response('Invalid room',{status:400});return env.ROOM.get(env.ROOM.idFromName(code)).fetch(req)}return env.ASSETS.fetch(req)}};
export class Room {
 constructor(state){this.state=state;this.ready=state.storage.get('game-v2').then(d=>this.data=d||initial())}
 async fetch(req){await this.ready;if(req.url.endsWith('/info'))return Response.json({ready:!!this.data.token});if(req.headers.get('Upgrade')?.toLowerCase()!=='websocket')return new Response('WebSocket required',{status:426});const pair=new WebSocketPair();this.state.acceptWebSocket(pair[1]);pair[1].serializeAttachment({});return new Response(null,{status:101,webSocket:pair[0]})}
 async webSocketMessage(ws,raw){await this.ready;let m;try{m=JSON.parse(raw)}catch{return}let d=this.data,a=ws.deserializeAttachment()||{};
 if(m.type==='hello') {if(m.role==='teacher'){if(!/^[\w-]{20,100}$/.test(m.token||''))return send(ws,{error:'Invalid teacher key'});if(d.token&&d.token!==m.token)return send(ws,{error:'Teacher key does not match this room'});d.token=m.token;a={role:'teacher',token:m.token}}
 else if(m.role==='student'){let name=String(m.name||'').trim().replace(/\s+/g,' ').slice(0,40),id=String(m.id||'');if(!d.token||!name||!/^[-\w]{20,100}$/.test(id))return send(ws,{error:'Room or name invalid'});let p=d.players.find(x=>x.id===id);if(!p&&d.players.some(x=>x.name.toLowerCase()===name.toLowerCase()))return send(ws,{error:'Name already in use; add a last initial'});if(!p)d.players.push({id,name,score:0});a={role:'student',id}}
 else if(m.role==='board'&&d.token)a={role:'board'};else return;ws.serializeAttachment(a)
 } else if(a.role==='teacher'&&a.token===d.token){if(m.type==='open'&&d.phase!=='active'&&d.phase!=='finished'&&d.used.length<8){let idx=Number(m.index);if(!Number.isInteger(idx)||idx<0||idx>=CATEGORIES[d.round].words.length||d.used.includes(idx))return;d.target=idx;d.used.push(idx);d.responses={};d.correctCount=0;d.phase='active'}
 else if(m.type==='close'&&d.phase==='active')d.phase='closed';
 else if(m.type==='next'&&d.phase!=='active'){if(d.round<CATEGORIES.length-1){d.round++;d.used=[];d.target=null;d.responses={};d.phase='ready'}else d.phase='finished'}
 else if(m.type==='reset'){const token=d.token;this.data=initial();this.data.token=token;d=this.data}
 else return;
 } else if(a.role==='student'&&m.type==='answer'&&d.phase==='active'&&!d.responses[a.id]){let idx=Number(m.index),p=d.players.find(x=>x.id===a.id);if(!p||!Number.isInteger(idx)||idx<0||idx>=CATEGORIES[d.round].words.length)return;let correct=idx===d.target,points=correct?Math.max(1,10-d.correctCount++):0;p.score+=points;d.responses[a.id]={index:idx,correct,points}}
 else return;await this.state.storage.put('game-v2',d);this.broadcast()}
 view(ws){const a=ws.deserializeAttachment()||{},d=this.data,sorted=[...d.players].sort((x,y)=>y.score-x.score||x.name.localeCompare(y.name));const rank=p=>1+sorted.filter(x=>x.score>p.score).length;const result={round:d.round+1,total:CATEGORIES.length,category:CATEGORIES[d.round].name,words:CATEGORIES[d.round].words,phase:d.phase,signCount:d.used.length,studentCount:d.players.length,leaderboard:sorted.slice(0,10).map(p=>({name:p.name,score:p.score,rank:rank(p)}))};if(a.role==='teacher'&&a.token===d.token)result.teacher={used:d.used,target:d.target,answered:Object.keys(d.responses).length};if(a.role==='student'){const p=d.players.find(x=>x.id===a.id);result.me=p?{score:p.score,rank:rank(p),answer:d.responses[p.id]||null}:null}return result}
 broadcast(){for(const ws of this.state.getWebSockets())send(ws,this.view(ws))}
}
