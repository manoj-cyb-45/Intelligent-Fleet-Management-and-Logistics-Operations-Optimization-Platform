import {
 LineChart,
 Line,
 XAxis,
 YAxis,
 Tooltip,
 ResponsiveContainer
} from "recharts";

const data=[
 {day:"Mon",trips:24},
 {day:"Tue",trips:31},
 {day:"Wed",trips:28},
 {day:"Thu",trips:42},
 {day:"Fri",trips:55},
 {day:"Sat",trips:47},
 {day:"Sun",trips:38}
];

export default function LineChartCard(){

 return(

  <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 h-80">

   <h3 className="text-xl mb-4">
    Fleet Performance
   </h3>

   <ResponsiveContainer width="100%" height="90%">

    <LineChart data={data}>

     <XAxis dataKey="day"/>

     <YAxis/>

     <Tooltip/>

     <Line
      dataKey="trips"
      stroke="#2563EB"
      strokeWidth={4}
     />

    </LineChart>

   </ResponsiveContainer>

  </div>

 );

}