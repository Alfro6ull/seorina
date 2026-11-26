import { photoLibraryURL, photosFor, readPhotoLibrary } from '../assets/photos/library.js';
const grid=document.querySelector('#gallery-grid'), status=document.querySelector('#gallery-status');
try{
 const rows=await readPhotoLibrary();
 // Reuse the six existing public MUSE files. Future Gallery-only approvals need not be in MUSE.
 const existingPublic=photosFor(rows,'muse').filter(photo=>photo.rightsStatus==='existing-muse-only');
 const galleryApproved=photosFor(rows,'gallery');
 const photos=[...new Map([...existingPublic,...galleryApproved].map(photo=>[photo.id,photo])).values()];
 const museIds=new Set(photosFor(rows,'muse').map(photo=>photo.id));
 if(!photos.length)throw Error('Empty photo library');
 const fragment=document.createDocumentFragment();
 for(const [i,photo] of photos.entries()){
  const card=document.createElement('figure');
  const imageLink=document.createElement('a');
  if(museIds.has(photo.id)){
   const exhibit=new URL('../muse/particles/',location.href);exhibit.searchParams.set('photo',photo.id);
   imageLink.href=exhibit.href;imageLink.setAttribute('aria-label','在记忆粒子中查看 '+photo.title);
  }else{
   imageLink.href=new URL(photo.src,photoLibraryURL);imageLink.setAttribute('aria-label','查看照片 '+photo.title);
  }
  imageLink.className='gallery-image';
  const image=document.createElement('img');image.src=new URL(photo.src,photoLibraryURL);image.alt=photo.title;
  if(i>2)image.loading='lazy';image.decoding='async';imageLink.append(image);
  const cap=document.createElement('figcaption');
  const source=new URL(photo.instagramPost||photo.source);
  if(photo.instagramPosition&&source.hostname==='www.instagram.com')source.searchParams.set('img_index',String(photo.instagramPosition));
  if(source.protocol==='https:'&&!source.username&&!source.password){
   const a=document.createElement('a');a.href=source.href;a.textContent=photo.title+' ↗';a.target='_blank';a.rel='noopener noreferrer';cap.append(a);
  }else cap.textContent=photo.title;
  card.append(imageLink,cap);fragment.append(card);
 }
 grid.append(fragment);
}catch{
 status.textContent='图库暂时无法读取。';status.hidden=false;
}
