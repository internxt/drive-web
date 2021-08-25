import { bytesToString } from '../services/size.service';
import { getUserLimitString } from '../services/usage.service';
import * as Unicons from '@iconscout/react-unicons';

export default function PlanUsage({ limit, usage, isLoading, className = '' }: {limit:number, usage:number, isLoading:boolean, className?: string}): JSX.Element{
  return (
    <div className={`flex flex-col justify-center w-52 rounded-md ${className}`}>
      <div className="flex items-center text-neutral-500 mb-3">
        <Unicons.UilChartPie className="text-sm mr-2" size="20"></Unicons.UilChartPie>
        <p >Usage</p>
      </div>
      <div className='flex justify-start h-1.5 w-full bg-blue-20 rounded-lg overflow-hidden mb-3'>
        <div className='h-full bg-blue-70' style={{ width: (usage / limit) * 100 }} />
      </div>
      {isLoading ?
        <p>Loading...</p> :
        <p className="text-neutral-700 m-0">{bytesToString(usage) || '0'} of {getUserLimitString(limit)}</p>
      }

    </div>);
}