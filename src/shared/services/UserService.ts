// import Cookies from 'js-cookie';
import { Err, None, Ok, Option, Result, Some } from "@sniptt/monads";
import IsomorphicCookie from "isomorphic-cookie";
import jwt_decode from "jwt-decode";
import { LoginResponse, MyUserInfo } from "lemmy-js-client";
import { BehaviorSubject, Subject } from "rxjs";
import { isHttps } from "../env";

interface Claims {
  sub: number;
  iss: string;
  iat: number;
}

interface JwtInfo {
  claims: Claims;
  jwt: string;
}

export class UserService {
  private static _instance: UserService;
  public myUserInfo: Option<MyUserInfo> = None;
  public jwtInfo: Option<JwtInfo> = None;
  public jwtSub: Subject<Option<JwtInfo>> = new Subject<Option<JwtInfo>>();
  public unreadInboxCountSub: BehaviorSubject<number> =
    new BehaviorSubject<number>(0);
  public unreadReportCountSub: BehaviorSubject<number> =
    new BehaviorSubject<number>(0);
  public unreadApplicationCountSub: BehaviorSubject<number> =
    new BehaviorSubject<number>(0);

  private constructor() {
    this.setJwtInfo();
  }

  public login(res: LoginResponse) {
    let expires = new Date();
    expires.setDate(expires.getDate() + 365);
    IsomorphicCookie.save("jwt", res.jwt, { expires, secure: isHttps });
    console.log("jwt cookie set");
    this.setJwtInfo();
  }

  public logout() {
    this.jwtInfo = None;
    this.myUserInfo = None;
    this.jwtSub.next(this.jwtInfo);
    IsomorphicCookie.remove("jwt"); // TODO is sometimes unreliable for some reason
    document.cookie = "jwt=; Max-Age=0; path=/; domain=" + location.host;
    location.reload(); // TODO may not be necessary anymore
    console.log("Logged out.");
  }

  public get auth(): Result<string, string> {
    // Can't use match to convert to result for some reason
    let jwt = this.jwtInfo.map(j => j.jwt);
    if (jwt.isSome()) {
      return Ok(jwt.unwrap());
    } else {
      return Err("No JWT cookie found");
    }
  }

  private setJwtInfo() {
    let jwt = IsomorphicCookie.load("jwt");

    if (jwt) {
      let jwtInfo: JwtInfo = { jwt, claims: jwt_decode(jwt) };
      this.jwtInfo = Some(jwtInfo);
      this.jwtSub.next(this.jwtInfo);
    }
  }

  public static get Instance() {
    return this._instance || (this._instance = new this());
  }
}
