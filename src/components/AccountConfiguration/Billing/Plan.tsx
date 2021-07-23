import React from 'react';
import { StripeProductNames, StripeSimpleNames } from '../../../models/interfaces';
import { getIcon } from '../../../services/icon.service';
import ButtonPrimary from '../../Buttons/ButtonPrimary';

interface PlanProps {
  name: StripeProductNames,
  description: string,
  size: StripeSimpleNames,
  price: string,
  buttonText: string,
  characteristics: string[]
}

const ListItem = ({ text }: { text: string }): JSX.Element => (
  <div className='flex justify-start items-center mb-2'>
    <img src={getIcon('checkBlue')} alt="check" />
    <p className='text-xs ml-2.5'>{text}</p>
  </div>
);

const Plan = ({ name, description, size, price, buttonText, characteristics }: PlanProps): JSX.Element => {
  return (
    <div className='w-full h-full flex flex-col justify-center text-neutral-700 p-7'>
      <h2 className='text-lg font-medium text-left'>{name}</h2>
      <p className='text-xs text-left'>{`${size} ${description}`}</p>

      <div className='flex justify-between items-end mt-3'>
        <p className='text-3xl font-semibold'>{size}</p>
        <p className='text-xl font-semibold'>{price}€</p>
      </div>
      <p className='text-right text-xs font-normal -mt-0.5 mb-2'>/month</p>

      <ButtonPrimary width='w-full' text={buttonText} onClick={() => { }} />

      <div className='mt-7' />
      {
        characteristics.map((text, index) => <ListItem key={index} text={text} />)
      }
    </div>
  );
};

export default Plan;
