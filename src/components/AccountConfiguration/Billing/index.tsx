import React, { Fragment } from 'react';
import { useState } from 'react';
import { getIcon } from '../../../services/getIcon';
import Plan from './Plan';
import './billing.scss';
import { useEffect } from 'react';
import { loadAvailableProducts } from '../../../services/products.service';
import notify from '../../Notifications';
import { IStripeProduct } from '../../../models/interfaces';

const Option = ({ text, currentOption, isBusiness, onClick }: { text: string, currentOption: 'individual' | 'business', isBusiness: boolean, onClick: () => void }) => {
  const Body = () => {
    switch (true) {
      case isBusiness && currentOption === 'business':
        return (
          <div className='option border-b-2 border-blue-60' onClick={onClick}>
            <img src={getIcon('buildingBlue')} alt="house" className='active' />
            <span>{text}</span>
          </div>
        );

      case isBusiness && currentOption === 'individual':
        return (
          <div className='option' onClick={onClick}>
            <img src={getIcon('buildingGray')} alt="house" />
            <span>{text}</span>
          </div>
        );

      case !isBusiness && currentOption === 'individual':
        return (
          <div className='option border-b-2 border-blue-60' onClick={onClick}>
            <img src={getIcon('houseBlue')} alt="house" className='active' />
            <span>{text}</span>
          </div>
        );

      case !isBusiness && currentOption === 'business':
        return (
          <div className='option' onClick={onClick}>
            <img src={getIcon('houseGray')} alt="house" />
            <span>{text}</span>
          </div>
        );

      default: return null;
    }
  };

  return (
    <Body />
  );
};

const Billing = (): JSX.Element => {
  const [currentOption, setCurrentOption] = useState<'individual' | 'business'>('individual');
  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState<IStripeProduct[]>([]);

  useEffect(() => {
    const getProducts = async () => {
      try {
        const products = await loadAvailableProducts();

        setProducts(products);
      } catch (err) {
        notify(err.message, 'error');
      } finally {
        setIsLoading(false);
      }
    };

    getProducts();
  }, []);

  return (
    <div className='flex flex-col w-full border border-m-neutral-60 rounded-xl mt-10'>
      <div className='flex justify-evenly items-center h-11'>
        <Option text='Individuals' currentOption={currentOption} isBusiness={false} onClick={() => {
          setCurrentOption('individual');
        }} />
        <div className='w-px h-4 border-r border-m-neutral-60' />
        <Option text='Business' currentOption={currentOption} isBusiness={true} onClick={() => {
          setCurrentOption('business');
        }} />
      </div>

      <span className='text-sm text-m-neutral-100 text-center py-2 border-t border-b border-m-neutral-60'>
        One plan for complete use of all Interxt's secure services. It's simple to upgrade in-app at any time.
      </span>

      <div className='flex h-88'>
        {!isLoading ?
          products.map((product, index) => (
            <Fragment>
              <Plan
                name={product.name}
                description='of encrypted storage'
                size={product.metadata.simple_name}
                price={product.metadata.price_eur}
                buttonText='Subscribe'
                characteristics={['Web, Desktop & Mobile apps', 'Unlimited devices', 'Secure file sharing']}
              />
              {index < 2 && <div className='h-full border-r border-m-neutral-60' />}
            </Fragment>
          ))
          :
          <span>loading haha</span>
        }
      </div>
    </div>
  );
};

export default Billing;
