import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { MailService } from './mail/mail.service';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'oracle',
        schema: process.env.ORACLE_SCHEMA || undefined,
        username: process.env.ORACLE_USER,
        password: process.env.ORACLE_PASSWORD,
        // oracledb@6 (thin) acepta Easy Connect con o sin //
        connectString: process.env.ORACLE_CONNECT_STRING, // ej: //localhost:51521/XEPDB1 ó //10.10.0.3:1521/XEPDB1
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false, // respeta tu DDL
        logging: process.env.NODE_ENV !== 'production',
      }),
    }),
    UsersModule,
    AuthModule,
    MailModule,
  ],
})
export class AppModule {}
