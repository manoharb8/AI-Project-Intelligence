import '@testing-library/jest-dom/vitest';
import {configure} from '@testing-library/dom';
import {cleanup} from '@testing-library/react';
import {afterEach} from 'vitest';
afterEach(cleanup);

configure({asyncUtilTimeout:3000});
