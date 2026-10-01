"use client";
import {useEffect} from 'react';
export default function StaffRedirect(){
 const destination='/Resonant-Relay/arrow/orbit/?panel=moderation&queue=email';
 useEffect(()=>{window.location.replace(destination);},[destination]);
 return <main className="p-6"><h1>ARROW staff</h1><p>Staff controls are in the Orbit command panel.</p><a href={destination}>Open ARROW staff</a></main>;
}
