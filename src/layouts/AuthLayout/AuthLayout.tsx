import { Outlet } from 'react-router-dom';

import loginIllustration from '../../assets/login-illustration.svg';
import { BrandLogo } from '../../components/common/BrandLogo';

import classes from './AuthLayout.module.css';

export function AuthLayout() {
  return (
    <main className={classes.authPage}>
      <section aria-hidden="true" className={classes.illustrationPanel}>
        <img alt="" className={classes.illustration} src={loginIllustration} />
      </section>
      <section className={classes.formPanel}>
        <div className={classes.formContent}>
          <div className={classes.brand}>
            <BrandLogo compact />
          </div>
          <Outlet />
        </div>
      </section>
    </main>
  );
}
