(()=>{
const root=document.getElementById('imsDemoRoot');
if(!root)return;

const lang=document.documentElement.lang==='ja'?'ja':'en';
const text={
 en:{
  healthy:'Healthy',low:'Low stock',out:'Out of stock',use:'Use',
  receive:'Receive',transfer:'Transfer',count:'Count',ship:'Ship',
  source:'Source location',destination:'Destination location',
  quantity:{receive:'Quantity received',transfer:'Quantity transferred',count:'Actual quantity counted',ship:'Quantity shipped'},
  help:{
   receive:'Adds stock to the selected destination.',
   transfer:'Moves stock atomically between two different locations.',
   count:'Sets the selected location to the actual quantity counted.',
   ship:'Removes stock only when enough stock is available.'
  },
  submit:{receive:'Record receive',transfer:'Record transfer',count:'Confirm count',ship:'Record shipment'},
  choose:'Selected {product}. Choose an operation and quantity.',
  success:{
   receive:'Received {quantity} of {product} into {destination}.',
   transfer:'Transferred {quantity} of {product} from {source} to {destination}.',
   count:'Counted {product} at {source}: {before} → {quantity}.',
   ship:'Shipped {quantity} of {product} from {source}.'
  },
  invalidQuantity:'Enter a valid whole-number quantity.',
  sameLocation:'Choose two different locations for a transfer.',
  insufficient:'Not enough stock at {source}. Available: {available}.',
  reset:'Demo data was reset. Every change remains temporary.',
  initial:'Sample opening balance',noMatches:'No matching products.',
  movementLocation:{receive:'Into {destination}',ship:'From {source}',count:'At {source}',transfer:'{source} → {destination}'}
 },
 ja:{
  healthy:'適正',low:'要補充',out:'在庫切れ',use:'選択',
  receive:'入庫',transfer:'移動',count:'棚卸',ship:'出庫',
  source:'移動元',destination:'移動先',
  quantity:{receive:'入庫数量',transfer:'移動数量',count:'実在庫数',ship:'出庫数量'},
  help:{
   receive:'選択した移動先へ在庫を追加します',
   transfer:'異なる2つの保管場所間で在庫をまとめて移動します',
   count:'選択した保管場所の在庫を実際に数えた数量へ更新します',
   ship:'十分な在庫がある場合だけ出庫します'
  },
  submit:{receive:'入庫を記録',transfer:'移動を記録',count:'棚卸を確定',ship:'出庫を記録'},
  choose:'{product}を選択しました。操作と数量を指定してください',
  success:{
   receive:'{product}を{destination}へ{quantity}入庫しました',
   transfer:'{product}を{source}から{destination}へ{quantity}移動しました',
   count:'{source}の{product}を棚卸しました：{before} → {quantity}',
   ship:'{source}から{product}を{quantity}出庫しました'
  },
  invalidQuantity:'0以上の整数を正しく入力してください',
  sameLocation:'移動元と異なる移動先を選択してください',
  insufficient:'{source}の在庫が不足しています。現在庫：{available}',
  reset:'デモデータを初期状態へ戻しました。すべての変更は一時的です',
  initial:'サンプル初期在庫',noMatches:'該当する商品はありません',
  movementLocation:{receive:'入庫先：{destination}',ship:'出庫元：{source}',count:'棚卸場所：{source}',transfer:'{source} → {destination}'}
 }
}[lang];

const seed={
 locations:[
  {id:'main',name:{en:'Main / A-01',ja:'本社 / A-01'}},
  {id:'osaka',name:{en:'Osaka / B-02',ja:'大阪 / B-02'}}
 ],
 products:[
  {id:'cup',sku:'PC-1204',barcode:'4901000001204',name:{en:'Paper Cup 12oz',ja:'紙コップ 12oz'},reorder:40,stock:{main:326,osaka:20}},
  {id:'box',sku:'SB-2088',barcode:'4901000002089',name:{en:'Shipping Box M',ja:'配送箱 M'},reorder:60,stock:{main:84,osaka:12}},
  {id:'label',sku:'LR-0041',barcode:'4901000000047',name:{en:'Label Roll',ja:'ラベルロール'},reorder:30,stock:{main:18,osaka:0}},
  {id:'paper',sku:'TP-3011',barcode:'4901000003017',name:{en:'Thermal Paper',ja:'感熱紙'},reorder:25,stock:{main:41,osaka:9}},
  {id:'bin',sku:'BN-1008',barcode:'4901000001006',name:{en:'Storage Bin S',ja:'収納コンテナ S'},reorder:50,stock:{main:210,osaka:60}},
  {id:'glove',sku:'SG-0092',barcode:'4901000000092',name:{en:'Safety Gloves L',ja:'作業用手袋 L'},reorder:20,stock:{main:0,osaka:0}}
 ]
};

const $=(selector,context=document)=>context.querySelector(selector);
const $$=(selector,context=document)=>[...context.querySelectorAll(selector)];
const format=(template,values)=>Object.entries(values).reduce((result,[key,value])=>result.replaceAll(`{${key}}`,String(value)),template);
const escapeHtml=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
const cloneProducts=()=>seed.products.map(product=>({...product,stock:{...product.stock}}));
const locationName=id=>seed.locations.find(location=>location.id===id)?.name[lang]||id;
const productName=product=>product.name[lang];
const totalStock=product=>Object.values(product.stock).reduce((sum,quantity)=>sum+quantity,0);
const health=product=>{
 const total=totalStock(product);
 if(total===0)return{label:text.out,className:'out'};
 if(total<=product.reorder)return{label:text.low,className:'low'};
 return{label:text.healthy,className:'healthy'};
};

let products=[];
let movements=[];
let actionCount=0;

const elements={
 items:$('#kpiItems'),low:$('#kpiLow'),out:$('#kpiOut'),actions:$('#kpiActions'),
 search:$('#demoSearch'),empty:$('#demoEmpty'),inventory:$('#inventoryBody'),history:$('#demoHistoryBody'),
 form:$('#demoOperationForm'),operation:$('#demoOperation'),product:$('#demoProduct'),
 sourceField:$('#demoSourceField'),source:$('#demoSource'),destinationField:$('#demoDestinationField'),destination:$('#demoDestination'),
 quantity:$('#demoQuantity'),quantityLabel:$('#demoQuantityLabel'),help:$('#demoOperationHelp'),apply:$('#demoApply'),
 result:$('#demoResult'),reset:$('#demoReset')
};

function initialMovements(){
 const now=Date.now();
 return[
  {at:new Date(now-12*60000),operation:'receive',productId:'box',source:null,destination:'main',delta:'+24',reference:'RCV-1042'},
  {at:new Date(now-38*60000),operation:'transfer',productId:'cup',source:'main',destination:'osaka',delta:'20',reference:'TRF-0187'},
  {at:new Date(now-66*60000),operation:'count',productId:'label',source:'main',destination:null,delta:'−2',reference:'CNT-0064'},
  {at:new Date(now-95*60000),operation:'ship',productId:'paper',source:'main',destination:null,delta:'−10',reference:'SHP-2381'}
 ];
}

function setResult(message,type='neutral'){
 elements.result.textContent=message;
 elements.result.dataset.state=type;
}

function renderKpis(){
 const states=products.map(health);
 elements.items.textContent=String(products.length);
 elements.low.textContent=String(states.filter(state=>state.className==='low').length);
 elements.out.textContent=String(states.filter(state=>state.className==='out').length);
 elements.actions.textContent=String(actionCount);
}

function renderInventory(){
 const query=elements.search.value.trim().toLocaleLowerCase(lang==='ja'?'ja-JP':'en-US');
 const visible=products.filter(product=>[productName(product),product.sku,product.barcode].join(' ').toLocaleLowerCase(lang==='ja'?'ja-JP':'en-US').includes(query));
 elements.inventory.innerHTML=visible.map(product=>{
  const state=health(product);
  return `<tr>
   <td><strong>${escapeHtml(productName(product))}</strong><small>${escapeHtml(product.sku)} · ${escapeHtml(product.barcode)}</small></td>
   <td>${product.stock.main.toLocaleString()}</td>
   <td>${product.stock.osaka.toLocaleString()}</td>
   <td><strong>${totalStock(product).toLocaleString()}</strong></td>
   <td><span class="demo-health demo-health-${state.className}">${escapeHtml(state.label)}</span></td>
   <td><button class="mini-btn" type="button" data-demo-product="${escapeHtml(product.id)}">${escapeHtml(text.use)}</button></td>
  </tr>`;
 }).join('');
 elements.empty.hidden=visible.length>0;
 elements.empty.textContent=text.noMatches;
 $$('[data-demo-product]',elements.inventory).forEach(button=>button.addEventListener('click',()=>{
  const product=products.find(item=>item.id===button.dataset.demoProduct);
  elements.product.value=product.id;
  setResult(format(text.choose,{product:productName(product)}));
  elements.operation.focus({preventScroll:true});
  elements.form.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});
 }));
}

function movementLocation(movement){
 return format(text.movementLocation[movement.operation],{
  source:movement.source?locationName(movement.source):'',
  destination:movement.destination?locationName(movement.destination):''
 });
}

function renderHistory(){
 const dateFormat=new Intl.DateTimeFormat(lang==='ja'?'ja-JP':'en-US',{hour:'2-digit',minute:'2-digit'});
 elements.history.innerHTML=movements.slice(0,8).map(movement=>{
  const product=products.find(item=>item.id===movement.productId);
  return `<tr>
   <td>${escapeHtml(dateFormat.format(movement.at))}</td>
   <td>${escapeHtml(text[movement.operation])}</td>
   <td>${escapeHtml(productName(product))}<small>${escapeHtml(product.sku)}</small></td>
   <td>${escapeHtml(movementLocation(movement))}</td>
   <td><strong>${escapeHtml(movement.delta)}</strong></td>
   <td>${escapeHtml(movement.reference)}</td>
  </tr>`;
 }).join('');
}

function render(){
 renderKpis();
 renderInventory();
 renderHistory();
}

function syncOperationFields(){
 const operation=elements.operation.value;
 const hasSource=operation!=='receive';
 const hasDestination=operation==='receive'||operation==='transfer';
 elements.sourceField.hidden=!hasSource;
 elements.destinationField.hidden=!hasDestination;
 elements.quantityLabel.textContent=text.quantity[operation];
 elements.help.textContent=text.help[operation];
 elements.apply.textContent=text.submit[operation];
 elements.quantity.min=operation==='count'?'0':'1';
 if(operation!=='count'&&Number(elements.quantity.value)<1)elements.quantity.value='1';
}

function addMovement(operation,product,source,destination,delta){
 actionCount+=1;
 movements.unshift({
  at:new Date(),operation,productId:product.id,source,destination,delta,
  reference:`DEMO-${String(actionCount).padStart(3,'0')}`
 });
}

function submitOperation(event){
 event.preventDefault();
 const operation=elements.operation.value;
 const product=products.find(item=>item.id===elements.product.value);
 const source=elements.source.value;
 const destination=elements.destination.value;
 const quantity=Number(elements.quantity.value);
 const minimum=operation==='count'?0:1;
 if(!Number.isInteger(quantity)||quantity<minimum){
  setResult(text.invalidQuantity,'error');
  elements.quantity.focus();
  return;
 }
 if(operation==='transfer'&&source===destination){
  setResult(text.sameLocation,'error');
  elements.destination.focus();
  return;
 }
 if((operation==='transfer'||operation==='ship')&&product.stock[source]<quantity){
  setResult(format(text.insufficient,{source:locationName(source),available:product.stock[source]}),'error');
  elements.quantity.focus();
  return;
 }

 let before=0;
 let delta=quantity;
 if(operation==='receive')product.stock[destination]+=quantity;
 if(operation==='transfer'){
  product.stock[source]-=quantity;
  product.stock[destination]+=quantity;
 }
 if(operation==='count'){
  before=product.stock[source];
  delta=quantity-before;
  product.stock[source]=quantity;
 }
 if(operation==='ship'){
  product.stock[source]-=quantity;
  delta=-quantity;
 }

 addMovement(operation,product,operation==='receive'?null:source,operation==='ship'||operation==='count'?null:destination,operation==='transfer'?String(quantity):`${delta>=0?'+':'−'}${Math.abs(delta)}`);
 setResult(format(text.success[operation],{
  product:productName(product),quantity,before,
  source:locationName(source),destination:locationName(destination)
 }),'success');
 render();
}

function resetDemo(){
 products=cloneProducts();
 movements=initialMovements();
 actionCount=0;
 elements.search.value='';
 elements.operation.value='receive';
 elements.product.value=products[0].id;
 elements.source.value='main';
 elements.destination.value='osaka';
 elements.quantity.value='5';
 syncOperationFields();
 setResult(text.reset,'success');
 render();
}

function initialize(){
 products=cloneProducts();
 movements=initialMovements();
 const productOptions=products.map(product=>`<option value="${escapeHtml(product.id)}">${escapeHtml(product.sku)} / ${escapeHtml(productName(product))}</option>`).join('');
 const locationOptions=seed.locations.map(location=>`<option value="${escapeHtml(location.id)}">${escapeHtml(location.name[lang])}</option>`).join('');
 elements.product.innerHTML=productOptions;
 elements.source.innerHTML=locationOptions;
 elements.destination.innerHTML=locationOptions;
 elements.destination.value='osaka';
 elements.operation.addEventListener('change',syncOperationFields);
 elements.search.addEventListener('input',renderInventory);
 elements.form.addEventListener('submit',submitOperation);
 elements.reset.addEventListener('click',resetDemo);
 syncOperationFields();
 render();
}

initialize();
})();
