import { Widget } from '@typeform/embed-react';
import { useAppDispatch } from 'app/store/hooks';
import { uiActions } from 'app/store/slices/ui';
import BaseDialog from 'app/shared/components/BaseDialog/BaseDialog';


const SurveyDialog = (props: { isOpen: boolean }): JSX.Element => {
    const dispatch = useAppDispatch();

    const onClose = (): void => {
        dispatch(uiActions.setIsSurveyDialogOpen(false));
    };

    return (
        <BaseDialog
            isOpen={props.isOpen}
            title={''}
            panelClasses="px-6 py-8 w-156"
            onClose={onClose}
            bgColor={'bg-transparent'}
        >
            <div className='py-10'>
                <Widget id='YSglxhad' height={500} />
            </div>
        </BaseDialog>
    );
};


export default SurveyDialog;

