import React, { useEffect, useState } from 'react';
import { useActivity } from '../contexts/ActivityContext';
import { useCoupon } from '../contexts/CouponContext';
import Coupon from './Coupon';
import Text from '../config/Text';
import Button from './Button';

function CouponForm({ onClose, onSave, initialData }) {
  const { setCouponData } = useCoupon();
  const { addActivity, resetActivitiesForDeal } = useActivity();

  const initialFormState = initialData || {
    id: null,
    expiresHours: null,
    dealType: 'coupon', // Default to "coupon"
    dealValue: '',
    dealDescription: '',
    dealTitle: '',
    dealImage: null,
  };

  const [formState, setFormState] = useState(initialFormState);

  useEffect(() => {
    // Synchronize couponData with formState, now including dealValue
    setCouponData((prev) => ({
      ...prev,
      id: formState.id,
      title: formState.dealTitle,
      expires: formState.expiresHours,
      dealType: formState.dealType,
      image: formState.dealImage || null,
      value: formState.dealValue,
    }));
  }, [formState, setCouponData]);

  const handleDone = async () => {
    try {
      onClose();
    } catch (error) {
      console.error('Error:', error.message);
      alert('Failed. ' + error.message);
    }
  };

  const handleTypeChange = (e) =>
    setFormState((prev) => ({ ...prev, dealType: e.target.value }));
  const handleValueChange = (e) =>
    setFormState((prev) => ({ ...prev, dealValue: e.target.value }));
  const handleDescriptionChange = (e) =>
    setFormState((prev) => ({ ...prev, dealDescription: e.target.value }));
  const handleDealTitleChange = (e) =>
    setFormState((prev) => ({ ...prev, dealTitle: e.target.value }));

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setFormState((prev) => ({ ...prev, dealImage: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  let dealSymbol = '';
  if (formState.dealType === 'gift card') dealSymbol = '$';
  else if (formState.dealType === 'coupon') dealSymbol = '%';

  return (
    <div
      className="relative w-full h-full flex flex-col items-center"
      style={{
        backgroundColor: 'transparent',
        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)',
        padding: '4%',
      }}
    >
      {/* Scrollable Content Area */}
      <div className="flex flex-col w-full flex-grow items-start overflow-auto"> 
        {/* Changed to items-start and removed centering classes */}
        <Coupon isInForm={true} couponData={formState} />

        <div
          className="flex flex-col bg-white rounded-lg overflow-hidden px-[5%] box-border w-full max-w-lg mt-4"
          style={{ height: 'auto' }}
        >
          <div className="flex justify-between items-center mb-4 border-b border-gray-300 pb-4">
            <Text type="large" role="primary" className="text-left">
              Create
            </Text>
          </div>

          {/* Using a grid for form layout: 2 columns (label | input) */}
          <div className="grid grid-cols-[auto_1fr] gap-y-4 gap-x-4 text-left">

            {/* Type */}
            <Text type="medium" role="tertiary">
              Type
            </Text>
            <select
              value={formState.dealType}
              onChange={handleTypeChange}
              className="border border-gray-300 rounded-md px-2 py-1 text-black bg-white focus:ring-1 focus:ring-[#1A1A1A] focus:outline-none"
            >
              <option value="coupon">Coupon</option>
              <option value="gift card">Gift Card</option>
            </select>

            {/* Value */}
            <Text type="medium" role="tertiary">
              Value
            </Text>
            <div className="flex items-center">
              {formState.dealType === 'gift card' && (
                <span className="text-black mr-2 font-medium">$</span>
              )}
              <input
                type="text"
                placeholder={
                  formState.dealType === 'gift card' ? 'Dollars' : 'Percent'
                }
                value={formState.dealValue}
                onChange={handleValueChange}
                className="border border-gray-300 rounded-md px-2 py-1 text-black focus:ring-1 focus:ring-[#1A1A1A] focus:outline-none flex-1"
              />
              {formState.dealType === 'coupon' && (
                <span className="text-black ml-2 font-medium">{dealSymbol}</span>
              )}
            </div>

            {/* Title */}
            <Text type="medium" role="tertiary">
              Title
            </Text>
            <input
              type="text"
              placeholder="Add a title"
              value={formState.dealTitle}
              onChange={handleDealTitleChange}
              className="border border-gray-300 rounded-md px-2 py-1 text-black focus:ring-1 focus:ring-[#1A1A1A] focus:outline-none"
            />

            {/* Image Upload */}
            <Text type="medium" role="tertiary">
              Image
            </Text>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="text-black focus:ring-1 focus:ring-[#1A1A1A] focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Bottom Button */}
      <div className="w-full max-w-md mt-auto">
        <Button
          onClick={handleDone}
          type="secondary"
          className="w-full rounded-full font-semibold transition-all duration-150"
          style={{
            padding: 'clamp(1.25rem, 2.5%, 3rem)',
            fontSize: 'clamp(1.25rem, 2vw, 3rem)',
            textAlign: 'center',
          }}
        >
          Complete
        </Button>
      </div>
    </div>
  );
}

export default CouponForm;
