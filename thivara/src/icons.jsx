import React from 'react';
import {Monitor,Globe,Code2,Bot,Network,Cloud,Cpu,Lightbulb,Folder,ShieldCheck,DatabaseBackup,Database,BarChart3,Printer,Wifi,Cable,Server,Webhook,
 Brain,BookOpen,QrCode,FileSpreadsheet,GitBranch,Workflow,Boxes,Terminal,Activity,CalendarCheck,GraduationCap,Package,Receipt,LayoutDashboard,
 LayoutTemplate,ShoppingCart,Smartphone,Gauge,Radio,CircuitBoard,ClipboardList,FileText,Headset,Wrench,Cog,Bug,HardDrive,Download,Laptop} from 'lucide-react';

/* One distinct icon per service category (matched on the category name). */
const CAT_ICONS=[[/^IT|computer/i,Monitor],[/web/i,Globe],[/software|automation/i,Code2],[/\bAI\b|chatbot/i,Bot],[/network|infrastructure/i,Network],
 [/devops|cloud|server/i,Cloud],[/hardware|electronic|iot/i,Cpu],[/digital|consult/i,Lightbulb]];
export const catIconOf=name=>(CAT_ICONS.find(([r])=>r.test(name||''))||[0,Folder])[1];

/* Per-service icons. First matching rule wins, so specific words come before generic verbs. */
const SVC_ICONS=[
 [/bug/,Bug],[/virus|malware|security|ssl|https/,ShieldCheck],[/backup|restor|recovery/,DatabaseBackup],
 [/chatbot|virtual assistant/,Bot],[/knowledge base/,BookOpen],[/\bai\b/,Brain],
 [/barcode|qr/,QrCode],[/spreadsheet|excel|google sheets/,FileSpreadsheet],
 [/printer/,Printer],[/wi-?fi|router|coverage/,Wifi],[/cabling/,Cable],
 [/monitoring/,Activity],[/analysis|reporting|report/,BarChart3],[/dashboard/,LayoutDashboard],
 [/api|webhook|integration/,Webhook],[/e-?commerce/,ShoppingCart],[/responsive|mobile/,Smartphone],[/speed|optimi/,Gauge],
 [/landing|portfolio|institutional|redesign/,LayoutTemplate],[/contact form|content update/,FileText],
 [/domain|dns/,Globe],[/hosting|server|ram and ssd|linux/,Server],[/hdd|ssd|storage|cloning/,HardDrive],
 [/\bci\/cd|pipeline|workflow|automation|process/,Workflow],[/git|github/,GitBranch],[/docker|container/,Boxes],[/terminal|command/,Terminal],
 [/cloud/,Cloud],[/database/,Database],[/data entry|data organi|data import/,Database],
 [/attendance/,CalendarCheck],[/student|training|education/,GraduationCap],[/inventory/,Package],[/billing|invoice/,Receipt],
 [/iot|sensor/,Radio],[/pcb|circuit|electronic/,CircuitBoard],[/esp32|microcontroller|embedded|firmware|component/,Cpu],[/prototype/,Lightbulb],
 [/driver/,Download],[/network|ip address|file sharing|lan\b|user account/,Network],
 [/documentation|document/,FileText],[/planning|requirements|assessment|inspection|diagnos/,ClipboardList],
 [/consult/,Lightbulb],[/support|remote|on-site/,Headset],[/laptop|desktop|windows|operating system|formatting|computer/,Laptop],
 [/software|development|develop|website|web\b/,Code2],[/maintenance|repair|servicing|upgrade|troubleshoot|testing|debug/,Wrench],
 [/install|configur|setup|set up/,Cog]];
export function svcIconOf(name,catName){const n=(name||'').toLowerCase();const hit=SVC_ICONS.find(([r])=>r.test(n));return hit?hit[1]:catIconOf(catName)}

export const CatIcon=({name,size=16,className})=>{const I=catIconOf(name);return <I size={size} className={className}/>};
export const SvcIcon=({name,cat,size=16,className})=>{const I=svcIconOf(name,cat);return <I size={size} className={className}/>};
/* Rounded gradient tile holding an icon, used for categories and services. */
export const IconTile=({children,size=40,className=''})=><span className={`tile ${className}`} style={{width:size,height:size}}>{children}</span>;
