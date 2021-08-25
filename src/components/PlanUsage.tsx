import { bytesToString } from '../services/size.service';
import { getUserLimitString } from '../services/usage.service';

export default function PlanUsage({ limit, usage, isLoading, className = '' }: {limit:number, usage:number, isLoading:boolean, className?: string}): JSX.Element{
  return (
    <div className={`flex flex-col items-center justify-center w-56 h-14 bg-l-neutral-20 rounded-md ${className}`}>
      {isLoading ?
        <span>Loading...</span> :
        <span className='account_config_description m-0'>{bytesToString(usage) || '0'} of {getUserLimitString(limit)}</span>
      }

      <div className='flex justify-start h-1.5 w-full bg-blue-20 rounded-lg overflow-hidden mt-1'>
        <div className='h-full bg-blue-70' style={{ width: (usage / limit) * 100 }} />
      </div>
    </div>);
}